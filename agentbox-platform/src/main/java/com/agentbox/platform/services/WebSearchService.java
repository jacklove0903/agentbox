package com.agentbox.platform.services;

import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.jsoup.nodes.Element;
import org.jsoup.select.Elements;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;

@Service
public class WebSearchService {

    private static final Logger log = LoggerFactory.getLogger(WebSearchService.class);
    private static final int MAX_RESULTS = 6;
    private static final String DDG_URL = "https://html.duckduckgo.com/html/";

    public record SearchResult(String title, String url, String snippet) {}

    /**
     * Performs a web search using DuckDuckGo and returns top results.
     */
    public List<SearchResult> search(String query) throws IOException {
        log.info("Web search for: {}", query);

        Document doc = Jsoup.connect(DDG_URL)
                .data("q", query)
                .userAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
                        "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
                .header("Accept-Language", "zh-CN,zh;q=0.9,en;q=0.8")
                .timeout(10000)
                .post();

        Elements resultElements = doc.select(".result.results_links");
        List<SearchResult> results = new ArrayList<>();

        for (Element el : resultElements) {
            if (results.size() >= MAX_RESULTS) break;

            Element titleEl = el.selectFirst("a.result__a");
            Element snippetEl = el.selectFirst("a.result__snippet");

            if (titleEl == null) continue;

            String title = titleEl.text().trim();
            String url = titleEl.attr("href").trim();
            String snippet = snippetEl != null ? snippetEl.text().trim() : "";

            // DuckDuckGo wraps URLs in redirect links — extract the actual target URL
            if (url.contains("uddg=")) {
                try {
                    String encoded = url.substring(url.indexOf("uddg=") + 5);
                    int ampIdx = encoded.indexOf('&');
                    if (ampIdx > 0) encoded = encoded.substring(0, ampIdx);
                    url = URLDecoder.decode(encoded, StandardCharsets.UTF_8);
                } catch (Exception ignored) {}
            }

            if (!title.isBlank() && !url.isBlank()) {
                results.add(new SearchResult(title, url, snippet));
            }
        }

        log.info("Web search returned {} results", results.size());
        return results;
    }

    /**
     * Builds a system-prompt context string from search results for LLM injection.
     */
    public String buildSearchContext(List<SearchResult> results) {
        if (results == null || results.isEmpty()) {
            return "网络搜索未找到相关结果。请基于你自身的知识回答用户的问题，并告知用户搜索未返回结果。";
        }

        StringBuilder sb = new StringBuilder();
        sb.append("以下是针对用户问题的实时网络搜索结果，请综合这些信息回答用户的问题：\n\n");
        for (int i = 0; i < results.size(); i++) {
            SearchResult r = results.get(i);
            sb.append(String.format("[%d] %s\n链接: %s\n摘要: %s\n\n",
                    i + 1, r.title(), r.url(), r.snippet()));
        }
        sb.append("要求：\n");
        sb.append("1. 基于以上搜索结果综合回答用户问题\n");
        sb.append("2. 在回答末尾列出参考来源链接\n");
        sb.append("3. 如果搜索结果与问题无关，可以基于你的知识补充回答\n");
        return sb.toString();
    }
}
