package com.agentbox.platform.dto;

import lombok.Data;
import java.util.List;
import java.util.Map;

@Data
public class MessageRequest {
    private String userId;
    private String conversationId;
    private String message;
    private List<String> modelIds;
    private Map<String, Object> options;
    private List<String> imageUrls;
    /**
     * If true, skip conversation creation / update and do NOT persist any messages.
     * Used by utility tools (translator, prompt-enhancer, …) so they don't pollute
     * the user's conversation list.
     */
    private Boolean ephemeral;
}