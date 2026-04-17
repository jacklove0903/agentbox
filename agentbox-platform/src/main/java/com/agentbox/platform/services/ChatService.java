package com.agentbox.platform.services;

import com.agentbox.platform.dto.ChatHistoryRequest;
import com.agentbox.platform.dto.ChatHistoryResponse;
import com.agentbox.platform.dto.MessageRequest;
import com.agentbox.platform.dto.MessageResponse;
import com.agentbox.platform.models.Message;
import com.agentbox.platform.repositories.MessageRepository;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import org.springframework.ai.chat.model.ChatModel;
import org.springframework.ai.chat.model.ChatResponse;
import org.springframework.ai.chat.prompt.Prompt;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;

@Service
public class ChatService {

    @Autowired
    private ChatModel chatModel;

    @Autowired
    private MessageRepository messageRepository;

    public MessageResponse chat(MessageRequest request) {
        if (request == null) throw new IllegalArgumentException("request is required");
        if (request.getMessage() == null || request.getMessage().trim().isEmpty()) {
            throw new IllegalArgumentException("message is required");
        }
        if (request.getModelIds() == null || request.getModelIds().isEmpty()) {
            throw new IllegalArgumentException("modelIds is required");
        }

        String userId = request.getUserId() == null || request.getUserId().isBlank()
                ? "anonymous"
                : request.getUserId().trim();

        Map<String, MessageResponse.ModelResponse> responses = new HashMap<>();

        for (String modelId : request.getModelIds()) {
            if (modelId == null || modelId.isBlank()) continue;

            // Persist user message (per target model)
            Message userMsg = new Message();
            userMsg.setUserId(userId);
            userMsg.setModelId(modelId);
            userMsg.setRole(Message.Role.USER);
            userMsg.setContent(request.getMessage().trim());
            userMsg.setTimestamp(LocalDateTime.now());
            messageRepository.insert(userMsg);

            // NOTE: current backend has a single ChatModel bean. We reuse it for every modelId.
            ChatResponse chatResponse = chatModel.call(new Prompt(request.getMessage().trim()));
            String content = chatResponse.getResult().getOutput().getText();

            Message aiMsg = new Message();
            aiMsg.setUserId(userId);
            aiMsg.setModelId(modelId);
            aiMsg.setRole(Message.Role.AI);
            aiMsg.setContent(content);
            aiMsg.setTimestamp(LocalDateTime.now());
            messageRepository.insert(aiMsg);

            MessageResponse.ModelResponse mr = new MessageResponse.ModelResponse();
            mr.setContent(content);
            mr.setTimestamp(aiMsg.getTimestamp());
            responses.put(modelId, mr);
        }

        MessageResponse resp = new MessageResponse();
        resp.setResponses(responses);
        return resp;
    }

    public ChatHistoryResponse history(ChatHistoryRequest request) {
        if (request == null) throw new IllegalArgumentException("request is required");
        if (request.getUserId() == null || request.getUserId().isBlank()) {
            throw new IllegalArgumentException("userId is required");
        }
        if (request.getModelId() == null || request.getModelId().isBlank()) {
            throw new IllegalArgumentException("modelId is required");
        }

        int limit = request.getLimit() <= 0 ? 50 : Math.min(request.getLimit(), 200);

        List<Message> rows = messageRepository.selectList(
                new LambdaQueryWrapper<Message>()
                        .eq(Message::getUserId, request.getUserId().trim())
                        .eq(Message::getModelId, request.getModelId().trim())
                        .orderByDesc(Message::getTimestamp)
                        .last("limit " + limit)
        );

        // Reverse to chronological order for the client
        rows = rows.reversed();

        ChatHistoryResponse resp = new ChatHistoryResponse();
        resp.setMessages(
                rows.stream()
                        .filter(Objects::nonNull)
                        .map(m -> {
                            ChatHistoryResponse.MessageHistory mh = new ChatHistoryResponse.MessageHistory();
                            mh.setModelId(m.getModelId());
                            mh.setRole(m.getRole() == Message.Role.USER ? "user" : "assistant");
                            mh.setContent(m.getContent());
                            mh.setTimestamp(m.getTimestamp());
                            return mh;
                        })
                        .toList()
        );
        return resp;
    }
}

