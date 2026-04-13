package com.agentbox.platform.services;

import com.agentbox.platform.dto.ChatHistoryResponse;
import com.agentbox.platform.dto.MessageRequest;
import com.agentbox.platform.dto.MessageResponse;
import com.agentbox.platform.models.Message;
import com.agentbox.platform.repositories.MessageRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class MessageService {

    @Autowired
    private MessageRepository messageRepository;

    public MessageResponse processMessage(MessageRequest request) {
        // Save user message
        Message userMsg = new Message();
        userMsg.setUserId(request.getUserId() != null ? request.getUserId() : "anonymous");
        userMsg.setModelId("user"); // or handle differently
        userMsg.setRole(Message.Role.USER);
        userMsg.setContent(request.getMessage());
        messageRepository.save(userMsg);

        // Mock AI responses
        Map<String, MessageResponse.ModelResponse> responses = new HashMap<>();
        for (String modelId : request.getModelIds()) {
            MessageResponse.ModelResponse resp = new MessageResponse.ModelResponse();
            resp.setContent("Mock response from " + modelId + " for: " + request.getMessage());
            resp.setTimestamp(LocalDateTime.now());

            // Save AI message
            Message aiMsg = new Message();
            aiMsg.setUserId(userMsg.getUserId());
            aiMsg.setModelId(modelId);
            aiMsg.setRole(Message.Role.AI);
            aiMsg.setContent(resp.getContent());
            messageRepository.save(aiMsg);

            responses.put(modelId, resp);
        }

        MessageResponse response = new MessageResponse();
        response.setResponses(responses);
        return response;
    }

    public ChatHistoryResponse getChatHistory(String userId, String modelId, int limit) {
        List<Message> messages = messageRepository.findByUserIdAndModelId(userId, modelId);
        List<ChatHistoryResponse.MessageHistory> history = messages.stream()
                .limit(limit)
                .map(msg -> {
                    ChatHistoryResponse.MessageHistory h = new ChatHistoryResponse.MessageHistory();
                    h.setModelId(msg.getModelId());
                    h.setRole(msg.getRole().toString());
                    h.setContent(msg.getContent());
                    h.setTimestamp(msg.getTimestamp());
                    return h;
                })
                .collect(Collectors.toList());

        ChatHistoryResponse response = new ChatHistoryResponse();
        response.setMessages(history);
        return response;
    }
}