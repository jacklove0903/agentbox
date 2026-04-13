package com.agentbox.platform.dto;

import lombok.Data;
import java.util.List;
import java.util.Map;

@Data
public class MessageRequest {
    private String userId;
    private String message;
    private List<String> modelIds;
    private Map<String, Object> options;
}