package com.agentbox.platform.models;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;
import java.time.LocalDateTime;

@Data
@TableName("conversations")
public class Conversation {
    @TableId(type = IdType.ASSIGN_UUID)
    private String id;

    private String userId;

    private String title;

    private LocalDateTime createdAt;

    private LocalDateTime updatedAt;

    /** True once an AI-generated title has been applied (prevents duplicate generation). */
    private Boolean smartTitleGenerated;
}
