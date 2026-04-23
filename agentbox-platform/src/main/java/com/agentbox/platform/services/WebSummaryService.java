package com.agentbox.platform.services;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.springframework.ai.chat.messages.SystemMessage;
import org.springframework.ai.chat.messages.UserMessage;
import org.springframework.ai.chat.model.ChatModel;
import org.springframework.ai.chat.prompt.Prompt;
import org.springframework.ai.openai.OpenAiChatOptions;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.codec.ServerSentEvent;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Flux;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
public class WebSummaryService {

    private static final int MAX_CONTENT_CHARS = 12000;
    private static final String SUMMARY_MODEL = "Qwen/Qwen3.5-27B";

    @Autowired
    private ChatModel chatModel;

    @Autowired
    private ObjectMapper objectMapper;

    /**
     * Fetches the web page at the given URL, extracts its text content,
     * and streams a structured summary via the LLM.
     */
    public Flux<ServerSentEvent<String>> summarize(String url) {
        return Flux.create(sink -> {
            new Thread(() -> {
                try {
                    // 1. Fetch and extract text
                    sink.next(buildEvent("status", "正在抓取网页...", false, null));

                    Document doc = Jsoup.connect(url)
                            .userAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36")
                            .timeout(15000)
                            .followRedirects(true)
                            .get();

                    String title = doc.title();
                    String text = doc.body().text();
                    if (text.length() > MAX_CONTENT_CHARS) {
                        text = text.substring(0, MAX_CONTENT_CHARS) + "...（内容已截断）";
                    }

                    if (text.isBlank()) {
                        sink.next(buildEvent("error", "", true, "无法提取网页内容，页面可能需要 JavaScript 渲染"));
                        sink.complete();
                        return;
                    }

                    sink.next(buildEvent("status", "正在生成摘要...", false, null));

                    // 2. Build prompt
                    String systemPrompt = "你是一个专业的网页内容分析助手。请对以下网页内容进行结构化总结，包括：\n" +
                            "1. **一句话摘要**\n" +
                            "2. **核心要点**（3-5 个要点）\n" +
                            "3. **关键信息**（如有数据、时间、人物等）\n" +
                            "请使用中文回答，格式清晰。";

                    String userPrompt = "网页标题: " + title + "\n\n网页内容:\n" + text;

                    List<org.springframework.ai.chat.messages.Message> messages = List.of(
                            new SystemMessage(systemPrompt),
                            new UserMessage(userPrompt)
                    );

                    OpenAiChatOptions options = OpenAiChatOptions.builder()
                            .model(SUMMARY_MODEL)
                            .build();

                    // 3. Stream LLM response
                    StringBuilder fullContent = new StringBuilder();
                    chatModel.stream(new Prompt(messages, options))
                            .doOnNext(chatResp -> {
                                String delta = (chatResp.getResult() != null
                                        && chatResp.getResult().getOutput() != null)
                                        ? chatResp.getResult().getOutput().getText()
                                        : "";
                                if (delta != null) {
                                    fullContent.append(delta);
                                    sink.next(buildEvent("content", delta, false, null));
                                }
                            })
                            .doOnError(e -> {
                                sink.next(buildEvent("error", "", true,
                                        "摘要生成失败: " + e.getMessage()));
                                sink.complete();
                            })
                            .blockLast();

                    sink.next(buildEvent("done", "", true, null));
                    sink.complete();
                } catch (Exception e) {
                    String msg = e.getMessage();
                    if (msg != null && msg.contains("Status=4")) {
                        msg = "网页请求被拒绝（" + msg + "）";
                    } else if (msg != null && msg.contains("UnknownHost")) {
                        msg = "无法解析该域名，请检查 URL 是否正确";
                    }
                    sink.next(buildEvent("error", "", true, "抓取失败: " + msg));
                    sink.complete();
                }
            }).start();
        });
    }

    private ServerSentEvent<String> buildEvent(String type, String content, boolean done, String error) {
        try {
            Map<String, Object> data = new LinkedHashMap<>();
            data.put("type", type);
            data.put("content", content);
            data.put("done", done);
            if (error != null) data.put("error", error);
            return ServerSentEvent.<String>builder()
                    .data(objectMapper.writeValueAsString(data))
                    .build();
        } catch (Exception e) {
            return ServerSentEvent.<String>builder()
                    .data("{\"type\":\"error\",\"error\":\"serialization error\",\"done\":true}")
                    .build();
        }
    }
}
