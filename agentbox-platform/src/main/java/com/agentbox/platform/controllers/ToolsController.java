package com.agentbox.platform.controllers;

import com.agentbox.platform.models.ImageGeneration;
import com.agentbox.platform.services.ImageGenService;
import com.agentbox.platform.services.WebSummaryService;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.http.codec.ServerSentEvent;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import reactor.core.publisher.Flux;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/tools")
public class ToolsController {

    private final WebSummaryService webSummaryService;
    private final ImageGenService imageGenService;

    public ToolsController(WebSummaryService webSummaryService, ImageGenService imageGenService) {
        this.webSummaryService = webSummaryService;
        this.imageGenService = imageGenService;
    }

    // ---- Web Summarizer ----

    @PostMapping(value = "/summarize", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public Flux<ServerSentEvent<String>> summarize(@RequestBody Map<String, String> body) {
        String url = body.get("url");
        if (url == null || url.isBlank()) {
            throw new IllegalArgumentException("url is required");
        }
        if (!url.startsWith("http://") && !url.startsWith("https://")) {
            url = "https://" + url;
        }
        return webSummaryService.summarize(url);
    }

    // ---- Image Generator ----

    @PostMapping("/image-gen")
    public ResponseEntity<?> generateImage(@RequestBody Map<String, String> body, Authentication auth) {
        String userId = requirePrincipal(auth);
        String prompt = body.get("prompt");
        if (prompt == null || prompt.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "prompt is required"));
        }

        String model = body.getOrDefault("model", "Kwai-Kolors/Kolors");
        String size = body.getOrDefault("size", "1024x1024");

        try {
            ImageGeneration result = imageGenService.generate(userId, prompt.trim(), model, size);
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            return ResponseEntity.internalServerError()
                    .body(Map.of("error", e.getMessage() != null ? e.getMessage() : "unknown error"));
        }
    }

    @GetMapping("/image-gen/history")
    public ResponseEntity<List<ImageGeneration>> imageHistory(
            @RequestParam(defaultValue = "20") int limit,
            Authentication auth) {
        String userId = requirePrincipal(auth);
        return ResponseEntity.ok(imageGenService.getHistory(userId, limit));
    }

    private static String requirePrincipal(Authentication auth) {
        if (auth == null || auth.getName() == null || auth.getName().isBlank()) {
            throw new IllegalStateException("Unauthenticated request");
        }
        return auth.getName();
    }
}
