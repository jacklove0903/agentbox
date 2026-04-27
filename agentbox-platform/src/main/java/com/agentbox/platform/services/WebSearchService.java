package com.agentbox.platform.services;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.jsoup.nodes.Element;
import org.jsoup.select.Elements;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.net.URI;
import java.net.URLDecoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
public class WebSearchService {

    private static final Logger log = LoggerFactory.getLogger(WebSearchService.class);
    private static final int MAX_RESULTS = 6;
    private static final String DDG_HTML_URL = "https://html.duckduckgo.com/html/";
    private static final String DDG_LITE_URL = "https://lite.duckduckgo.com/lite/";
    private static final String SERPER_URL = "https://google.serper.dev/search";

    @Value("${web.search.serper.api-key:}")
    private String serperApiKey;

    @Value("${web.search.gl:cn}")
    private String searchRegion;

    @Value("${web.search.hl:zh-cn}")
    private String searchLanguage;

    private final HttpClient httpClient = HttpClient.newHttpClient();
    private final ObjectMapper objectMapper;

    public WebSearchService(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    public record SearchResult(String title, String url, String snippet) {}

    /**
     * Performs a web search using DuckDuckGo and returns top results.
     */
    public List<SearchResult> search(String query) throws IOException {
        log.info("Web search for: {}", query);
        List<SearchResult> results = new ArrayList<>();

        // Primary path: Serper (stable JSON API, closest to product-grade web tool).
        if (serperApiKey != null && !serperApiKey.isBlank()) {
            try {
                results = searchBySerper(query);
                if (!results.isEmpty()) {
                    log.info("Web search returned {} results (serper)", results.size());
                    return results;
                }
                log.warn("Serper search returned 0 results, fallback to DuckDuckGo");
            } catch (Exception e) {
                log.warn("Serper search failed: {}", e.getMessage());
            }
        } else {
            log.info("SERPER_API_KEY not configured, fallback to DuckDuckGo");
        }

        // Fallback path: DuckDuckGo HTML endpoint.
        try {
            Document doc = Jsoup.connect(DDG_HTML_URL)
                    .data("q", query)
                    .userAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
                            "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
                    .header("Accept-Language", "zh-CN,zh;q=0.9,en;q=0.8")
                    .header("Accept", "text/html,application/xhtml+xml")
                    .timeout(10000)
                    .get();

            Elements resultElements = doc.select(
                    ".result.results_links, .result, article[data-testid='result'], .web-result");
            extractResultsFromElements(resultElements, results);
        } catch (Exception e) {
            log.warn("DDG html search failed: {}", e.getMessage());
        }

        // Last fallback: DuckDuckGo lite endpoint.
        if (results.isEmpty()) {
            try {
                Document liteDoc = Jsoup.connect(DDG_LITE_URL)
                        .data("q", query)
                        .userAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64)")
                        .header("Accept-Language", "zh-CN,zh;q=0.9,en;q=0.8")
                        .timeout(10000)
                        .get();

                Elements liteResultRows = liteDoc.select("tr:has(a.result-link), tr:has(a[href*='uddg='])");
                extractResultsFromElements(liteResultRows, results);
            } catch (Exception e) {
                log.warn("DDG lite search failed: {}", e.getMessage());
            }
        }

        log.info("Web search returned {} results", results.size());
        return results;
    }

    private List<SearchResult> searchBySerper(String query) throws Exception {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("q", query);
        body.put("gl", searchRegion);
        body.put("hl", searchLanguage);
        body.put("num", MAX_RESULTS);

        String jsonBody = objectMapper.writeValueAsString(body);
        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(SERPER_URL))
                .header("X-API-KEY", serperApiKey)
                .header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(jsonBody))
                .build();

        HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
        if (response.statusCode() < 200 || response.statusCode() >= 300) {
            throw new IOException("Serper HTTP " + response.statusCode() + ": " + response.body());
        }

        JsonNode root = objectMapper.readTree(response.body());
        JsonNode organic = root.get("organic");
        List<SearchResult> out = new ArrayList<>();
        if (organic != null && organic.isArray()) {
            for (JsonNode item : organic) {
                if (out.size() >= MAX_RESULTS) break;
                String title = item.has("title") ? item.get("title").asText("").trim() : "";
                String url = item.has("link") ? item.get("link").asText("").trim() : "";
                String snippet = item.has("snippet") ? item.get("snippet").asText("").trim() : "";
                if (!title.isBlank() && !url.isBlank()) {
                    out.add(new SearchResult(title, url, snippet));
                }
            }
        }
        return out;
    }

    private void extractResultsFromElements(Elements elements, List<SearchResult> out) {
        for (Element el : elements) {
            if (out.size() >= MAX_RESULTS) break;

            Element titleEl = el.selectFirst("a.result__a, a[data-testid='result-title-a'], a.result-link, h2 a, a[href]");
            if (titleEl == null) continue;

            String title = titleEl.text() != null ? titleEl.text().trim() : "";
            String url = titleEl.attr("href") != null ? titleEl.attr("href").trim() : "";
            Element snippetEl = el.selectFirst(".result__snippet, .result-snippet, [data-testid='result-snippet'], .snippet");
            String snippet = snippetEl != null && snippetEl.text() != null ? snippetEl.text().trim() : "";

            url = normalizeDuckDuckGoUrl(url);
            if (!title.isBlank() && !url.isBlank()) {
                out.add(new SearchResult(title, url, snippet));
            }
        }
    }

    private String normalizeDuckDuckGoUrl(String rawUrl) {
        if (rawUrl == null) return "";
        String url = rawUrl.trim();
        if (url.contains("uddg=")) {
            try {
                String encoded = url.substring(url.indexOf("uddg=") + 5);
                int ampIdx = encoded.indexOf('&');
                if (ampIdx > 0) encoded = encoded.substring(0, ampIdx);
                return URLDecoder.decode(encoded, StandardCharsets.UTF_8);
            } catch (Exception ignored) {
                return url;
            }
        }
        return url;
    }

    /**
     * Builds a system-prompt context string from search results for LLM injection.
     */
    public String buildSearchContext(List<SearchResult> results) {
        if (results == null || results.isEmpty()) {
            return "网络搜索未找到相关结果。请基于你自身的知识回答用户的问题，并告知用户搜索未返回结果。";
        }

        StringBuilder sb = new StringBuilder();
        String now = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss"));
        sb.append("以下是针对用户问题的实时网络搜索结果，请综合这些信息回答用户的问题：\n");
        sb.append("检索时间：").append(now).append("\n\n");
        for (int i = 0; i < results.size(); i++) {
            SearchResult r = results.get(i);
            sb.append(String.format("[%d] %s\n链接: %s\n摘要: %s\n\n",
                    i + 1, r.title(), r.url(), r.snippet()));
        }
        sb.append("要求：\n");
        sb.append("1. 基于以上搜索结果综合回答用户问题，不要编造未出现的事实\n");
        sb.append("2. 在回答末尾单独输出“参考来源”，逐条列出使用到的链接\n");
        sb.append("3. 如结果中存在时间冲突，优先采用更新时间更近的信息\n");
        return sb.toString();
    }
}
