package com.agentbox.platform.models;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;
import java.time.LocalDateTime;

@Data
@TableName("model_votes")
public class ModelVote {
    @TableId(type = IdType.AUTO)
    private Long id;

    private String userId;

    private String conversationId;

    private String modelId;

    private String userMessage;

    private LocalDateTime createdAt;
}
