package com.agentbox.platform.models;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@TableName("uploaded_files")
public class UploadedFile {
    @TableId(type = IdType.INPUT)
    private String id;

    private String userId;

    private String originalName;

    private String contentType;

    private Long sizeBytes;

    /** Raw file bytes (BYTEA in PostgreSQL). */
    private byte[] data;

    private LocalDateTime createdAt = LocalDateTime.now();
}
