package com.agentbox.platform.controllers;

import com.agentbox.platform.dto.*;
import com.agentbox.platform.services.MessageService;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.chat.messages.SystemMessage;
import org.springframework.ai.chat.messages.UserMessage;
import org.springframework.ai.chat.model.ChatModel;
import org.springframework.ai.deepseek.DeepSeekChatOptions;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import reactor.core.publisher.Flux;

@RestController
@RequestMapping("/api/messages")
public class MessageController {


    private final ChatClient chatClient;

    public MessageController(ChatClient.Builder builder) {
        this.chatClient = builder.build();
    }
    @Autowired
    private MessageService messageService;
    @Autowired
    private ChatModel chatModel;
    @PostMapping("/send")
    public ResponseEntity<MessageResponse> sendMessage(@RequestBody MessageRequest request) {
        MessageResponse response = messageService.processMessage(request);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/history")
    public ResponseEntity<ChatHistoryResponse> getHistory(ChatHistoryRequest request) {
        ChatHistoryResponse response = messageService.getChatHistory(request.getUserId(), request.getModelId(), request.getLimit());
        return ResponseEntity.ok(response);
    }

    @PostMapping("/stream")
    public Flux<String> stream(){
        DeepSeekChatOptions options = DeepSeekChatOptions.builder()
                .model("deepseek-r1")
                .temperature(0.7)
                .build();

        SystemMessage systemMessage = new SystemMessage("你是一个生活百科助手");
        UserMessage userMessage = new UserMessage("你是谁？你基于什么模型");

         return chatModel.stream("你好。你是谁？");
    }



    @GetMapping("/test")

    public Flux<String> test(){

        return chatClient.prompt()
                .user("给我随机生成一本书，要求书名和作者都是中文")
                .stream()
                .content();

    }
}