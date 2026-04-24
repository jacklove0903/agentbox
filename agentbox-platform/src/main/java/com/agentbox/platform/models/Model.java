package com.agentbox.platform.models;

import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

@Data
@TableName("models")
public class Model {
    @TableId
    private String id;
    private String name;
    private String icon;
    private String provider;
    private String modelName;
    private Boolean enabled;
    private Integer sortOrder;
    /** Whether this model accepts image input in chat completions. */
    private Boolean supportsVision;
}