package com.agentbox.platform.dto;

import lombok.Data;

@Data
public class StreamChunk {
    private String modelId;
    private String content;
    private boolean done;
    private String error;
}
