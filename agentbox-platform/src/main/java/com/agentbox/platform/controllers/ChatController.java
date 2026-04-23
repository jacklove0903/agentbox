package com.agentbox.platform.controllers;

import com.agentbox.platform.dto.ChatHistoryRequest;
import com.agentbox.platform.dto.ChatHistoryResponse;
import com.agentbox.platform.dto.MessageRequest;
import com.agentbox.platform.dto.MessageResponse;
import com.agentbox.platform.services.ChatService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.http.codec.ServerSentEvent;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import reactor.core.publisher.Flux;

@RestController
@RequestMapping("/api/chat")
public class ChatController {

    @Autowired
    private ChatService chatService;

    @PostMapping("/message")
    public ResponseEntity<MessageResponse> message(@RequestBody MessageRequest request,
                                                   Authentication auth) {
        request.setUserId(requirePrincipal(auth));
        return ResponseEntity.ok(chatService.chat(request));
    }

    @PostMapping(value = "/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public Flux<ServerSentEvent<String>> stream(@RequestBody MessageRequest request,
                                                Authentication auth) {
        request.setUserId(requirePrincipal(auth));
        return chatService.chatStream(request);
    }

    @PostMapping("/history")
    public ResponseEntity<ChatHistoryResponse> history(@RequestBody ChatHistoryRequest request,
                                                       Authentication auth) {
        request.setUserId(requirePrincipal(auth));
        return ResponseEntity.ok(chatService.history(request));
    }

    private static String requirePrincipal(Authentication auth) {
        if (auth == null || auth.getName() == null || auth.getName().isBlank()) {
            throw new IllegalStateException("Unauthenticated request");
        }
        return auth.getName();
    }
}

