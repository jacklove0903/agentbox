package com.agentbox.platform.controllers;

import com.agentbox.platform.dto.ChatHistoryRequest;
import com.agentbox.platform.dto.ChatHistoryResponse;
import com.agentbox.platform.dto.MessageRequest;
import com.agentbox.platform.dto.MessageResponse;
import com.agentbox.platform.services.ChatService;
import com.agentbox.platform.services.TrialQuotaService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.http.codec.ServerSentEvent;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;
import reactor.core.publisher.Flux;

@RestController
@RequestMapping("/api/chat")
public class ChatController {

    @Autowired
    private ChatService chatService;

    @Autowired
    private TrialQuotaService trialQuotaService;

    @PostMapping("/message")
    public ResponseEntity<MessageResponse> message(@RequestBody MessageRequest request,
                                                   Authentication auth) {
        request.setUserId(requirePrincipal(auth));
        return ResponseEntity.ok(chatService.chat(request));
    }

    @PostMapping(value = "/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public Flux<ServerSentEvent<String>> stream(@RequestBody MessageRequest request,
                                                Authentication auth,
                                                @RequestHeader(value = "X-Guest-Id", required = false) String guestIdHeader,
                                                HttpServletRequest httpRequest) {
        String actorId = resolveActorId(auth, guestIdHeader, httpRequest, hasBearerToken(httpRequest));
        boolean authenticated = trialQuotaService.isAuthenticated(auth);
        trialQuotaService.consumeOrThrow(auth, actorId, "chat");
        request.setUserId(actorId);
        request.setEphemeral(!authenticated ? true : false);
        return chatService.chatStream(request);
    }

    @PostMapping("/enhance")
    public ResponseEntity<?> enhance(@RequestBody java.util.Map<String, String> body,
                                      Authentication auth,
                                      @RequestHeader(value = "X-Guest-Id", required = false) String guestIdHeader,
                                      HttpServletRequest httpRequest) {
        String actorId = resolveActorId(auth, guestIdHeader, httpRequest, hasBearerToken(httpRequest));
        trialQuotaService.consumeOrThrow(auth, actorId, "enhance");
        String prompt = body.get("prompt");
        if (prompt == null || prompt.isBlank()) {
            return ResponseEntity.badRequest().body(java.util.Map.of("error", "prompt is required"));
        }
        try {
            String enhanced = chatService.enhancePrompt(prompt.trim());
            return ResponseEntity.ok(java.util.Map.of("enhanced", enhanced));
        } catch (Exception e) {
            return ResponseEntity.internalServerError()
                    .body(java.util.Map.of("error", e.getMessage() != null ? e.getMessage() : "enhance failed"));
        }
    }

    @PostMapping("/history")
    public ResponseEntity<ChatHistoryResponse> history(@RequestBody ChatHistoryRequest request,
                                                       Authentication auth) {
        request.setUserId(requirePrincipal(auth));
        return ResponseEntity.ok(chatService.history(request));
    }

    private static String requirePrincipal(Authentication auth) {
        if (auth == null || auth.getName() == null || auth.getName().isBlank()) {
            throw new IllegalStateException("Unauthenticated request");
        }
        return auth.getName();
    }

    private String resolveActorId(Authentication auth,
                                  String guestIdHeader,
                                  HttpServletRequest request,
                                  boolean bearerProvided) {
        if (trialQuotaService.isAuthenticated(auth)) {
            return requirePrincipal(auth);
        }
        if (bearerProvided) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid or expired token");
        }
        return "guest:" + trialQuotaService.resolveGuestId(guestIdHeader, request.getRemoteAddr());
    }

    private boolean hasBearerToken(HttpServletRequest request) {
        String authHeader = request.getHeader(HttpHeaders.AUTHORIZATION);
        return authHeader != null && authHeader.startsWith("Bearer ");
    }
}

