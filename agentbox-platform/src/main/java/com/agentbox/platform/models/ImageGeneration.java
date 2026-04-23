package com.agentbox.platform.models;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@TableName("image_generations")
public class ImageGeneration {
    @TableId(type = IdType.AUTO)
    private Long id;

    private String userId;

    private String prompt;

    private String model;

    private String size;

    private String imageUrl;

    private LocalDateTime createdAt = LocalDateTime.now();
}
