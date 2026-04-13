package com.agentbox.platform.dto;

import lombok.Data;
import java.time.LocalDateTime;

@Data
public class ChatHistoryRequest {
    private String userId;
    private String modelId;
    private int limit = 50;
}