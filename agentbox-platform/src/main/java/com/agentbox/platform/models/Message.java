package com.agentbox.platform.models;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;
import java.time.LocalDateTime;

@Data
@TableName("messages")
public class Message {
    @TableId(type = IdType.AUTO)
    private Long id;

    private String userId;

    private String conversationId;

    private String modelId;

    private Role role;

    private String content;

    /** JSON array of image URLs attached to this message (user role only). Stored as TEXT. */
    private String imageUrls;

    private LocalDateTime timestamp = LocalDateTime.now();

    public enum Role {
        USER, AI
    }
}