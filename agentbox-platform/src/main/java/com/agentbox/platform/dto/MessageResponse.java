package com.agentbox.platform.dto;

import lombok.Data;
import java.time.LocalDateTime;
import java.util.Map;

@Data
public class MessageResponse {
    private Map<String, ModelResponse> responses;

    @Data
    public static class ModelResponse {
        private String content;
        private String error;
        private LocalDateTime timestamp;
    }
}