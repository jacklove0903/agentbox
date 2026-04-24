package com.agentbox.platform.controllers;

import com.agentbox.platform.models.UploadedFile;
import com.agentbox.platform.repositories.UploadedFileRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/files")
public class FileController {

    /** Hard limit: 2 MB per file (app-level; matches spring.servlet.multipart.max-file-size). */
    private static final long MAX_FILE_SIZE = 2L * 1024 * 1024;
    /** Allowed MIME types (frontend enforces the same list). */
    private static final java.util.Set<String> ALLOWED_TYPES = java.util.Set.of(
            "image/jpeg", "image/png", "image/webp", "image/gif");

    @Autowired
    private UploadedFileRepository uploadedFileRepository;

    @PostMapping("/upload")
    public ResponseEntity<?> upload(@RequestParam("file") MultipartFile file,
                                     Authentication auth) {
        if (auth == null || auth.getName() == null) {
            return ResponseEntity.status(401).body(Map.of("error", "unauthorized"));
        }
        if (file.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "file is empty"));
        }
        if (file.getSize() > MAX_FILE_SIZE) {
            return ResponseEntity.status(413).body(Map.of(
                    "error", "文件过大，最大支持 2MB（当前 " + (file.getSize() / 1024) + " KB）"));
        }
        String contentType = file.getContentType();
        if (contentType == null || !ALLOWED_TYPES.contains(contentType.toLowerCase())) {
            return ResponseEntity.status(415).body(Map.of(
                    "error", "不支持的文件类型：" + contentType + "（仅支持 jpg/png/webp/gif）"));
        }

        try {
            String originalName = file.getOriginalFilename();
            String ext = "";
            if (originalName != null && originalName.contains(".")) {
                ext = originalName.substring(originalName.lastIndexOf("."));
            }
            String id = UUID.randomUUID() + ext;

            UploadedFile record = new UploadedFile();
            record.setId(id);
            record.setUserId(auth.getName());
            record.setOriginalName(originalName);
            record.setContentType(file.getContentType());
            record.setSizeBytes(file.getSize());
            record.setData(file.getBytes());
            record.setCreatedAt(LocalDateTime.now());
            uploadedFileRepository.insert(record);

            String url = "/api/files/" + id;
            Map<String, Object> resp = new HashMap<>();
            resp.put("url", url);
            resp.put("name", originalName != null ? originalName : id);
            return ResponseEntity.ok(resp);
        } catch (IOException e) {
            return ResponseEntity.internalServerError().body(Map.of("error", "upload failed: " + e.getMessage()));
        }
    }

    @GetMapping("/{id}")
    public ResponseEntity<byte[]> serve(@PathVariable String id) {
        UploadedFile record = uploadedFileRepository.selectById(id);
        if (record == null || record.getData() == null) {
            return ResponseEntity.notFound().build();
        }
        String contentType = record.getContentType();
        if (contentType == null || contentType.isBlank()) {
            contentType = "application/octet-stream";
        }
        return ResponseEntity.ok()
                .header("Content-Type", contentType)
                .header("Cache-Control", "public, max-age=86400")
                .body(record.getData());
    }
}
