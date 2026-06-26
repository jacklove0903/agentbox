package com.agentbox.platform.dto;

import lombok.Data;

/**
 * Represents a model available on SiliconFlow that can be added to the platform.
 */
@Data
public class AvailableModel {
    /** Full model ID on SiliconFlow, e.g. "Qwen/Qwen3-8B" */
    private String id;
    /** Human-readable name, e.g. "Qwen3 8B" */
    private String name;
    /** Icon URL for the model */
    private String icon;
    /** Whether this model supports vision/image input */
    private boolean supportsVision;
}
