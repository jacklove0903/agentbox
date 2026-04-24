package com.agentbox.platform.dto;

import lombok.Data;
import java.time.LocalDateTime;
import java.util.List;

@Data
public class ChatHistoryResponse {
    private List<MessageHistory> messages;

    @Data
    public static class MessageHistory {
        private String modelId;
        private String role;
        private String content;
        private List<String> imageUrls;
        private LocalDateTime timestamp;
    }
}