package com.agentbox.platform;

import org.junit.jupiter.api.Test;
import org.springframework.ai.chat.messages.AssistantMessage;
import org.springframework.ai.chat.messages.SystemMessage;
import org.springframework.ai.chat.messages.UserMessage;
import org.springframework.ai.chat.model.ChatModel;
import org.springframework.ai.chat.model.ChatResponse;
import org.springframework.ai.chat.model.Generation;
import org.springframework.ai.chat.model.ToolContext;
import org.springframework.ai.chat.prompt.ChatOptions;
import org.springframework.ai.chat.prompt.Prompt;
import org.springframework.ai.deepseek.DeepSeekChatOptions;
import org.springframework.ai.tool.ToolCallback;
import org.springframework.ai.tool.annotation.ToolParam;
import org.springframework.ai.tool.function.FunctionToolCallback;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.core.parameters.P;
import reactor.core.publisher.Flux;

import java.util.List;
import java.util.function.BiFunction;

@SpringBootTest
public class AgentboxPlatformApplicationTests {

    // ✅ 关键：让 Spring 自动注入，完全不用手动拼 apiKey
    @Autowired
    private ChatModel chatModel;

    // 天气工具
    public class WeatherTool implements BiFunction<String, ToolContext, String> {
        @Override
        public String apply(String city, ToolContext toolContext) {
            return "It's always sunny in " + city + "!";
        }
    }
    @Test
    void contextLoads() {

        DeepSeekChatOptions options = DeepSeekChatOptions.builder()
                .model("deepseek-r1")  // 这里必须改！
                .temperature(0.7)
                .build();

        SystemMessage systemMessage = new SystemMessage("你是一个生活百科助手");
        UserMessage userMessage = new UserMessage("你是谁？你基于什么模型");

//        ChatResponse call = chatModel.call(new Prompt(List.of(systemMessage, userMessage), options));
        Flux<ChatResponse> stream = chatModel.stream(new Prompt(List.of(systemMessage, userMessage), options));
//        Generation result = call.getResult();
        System.err.println(stream.toStream());
//        System.err.println(result.getOutput().getText());
    }
}