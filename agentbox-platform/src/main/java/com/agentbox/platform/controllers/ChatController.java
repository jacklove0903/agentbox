package com.agentbox.platform.controllers;

import com.agentbox.platform.dto.ChatHistoryRequest;
import com.agentbox.platform.dto.ChatHistoryResponse;
import com.agentbox.platform.dto.MessageRequest;
import com.agentbox.platform.dto.MessageResponse;
import com.agentbox.platform.services.ChatService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/chat")
public class ChatController {

    @Autowired
    private ChatService chatService;

    @PostMapping("/message")
    public ResponseEntity<MessageResponse> message(@RequestBody MessageRequest request) {
        return ResponseEntity.ok(chatService.chat(request));
    }

    @PostMapping("/history")
    public ResponseEntity<ChatHistoryResponse> history(@RequestBody ChatHistoryRequest request) {
        return ResponseEntity.ok(chatService.history(request));
    }
}

