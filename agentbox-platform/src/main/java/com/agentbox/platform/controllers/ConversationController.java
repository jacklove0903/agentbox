package com.agentbox.platform.controllers;

import com.agentbox.platform.models.Conversation;
import com.agentbox.platform.models.Message;
import com.agentbox.platform.repositories.ConversationRepository;
import com.agentbox.platform.repositories.MessageRepository;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/conversations")
public class ConversationController {

    @Autowired
    private ConversationRepository conversationRepository;

    @Autowired
    private MessageRepository messageRepository;

    /**
     * List all conversations for the current user, ordered by most recent first.
     */
    @GetMapping
    public ResponseEntity<List<Conversation>> list(Authentication auth) {
        String userId = requirePrincipal(auth);
        List<Conversation> conversations = conversationRepository.selectList(
                new LambdaQueryWrapper<Conversation>()
                        .eq(Conversation::getUserId, userId)
                        .orderByDesc(Conversation::getUpdatedAt)
        );
        return ResponseEntity.ok(conversations);
    }

    /**
     * Create a new conversation. Optionally accepts a title.
     */
    @PostMapping
    public ResponseEntity<Conversation> create(@RequestBody(required = false) Map<String, String> body,
                                                Authentication auth) {
        String userId = requirePrincipal(auth);
        String title = (body != null && body.get("title") != null) ? body.get("title") : "新对话";

        Conversation conv = new Conversation();
        conv.setId(UUID.randomUUID().toString());
        conv.setUserId(userId);
        conv.setTitle(title.length() > 50 ? title.substring(0, 50) : title);
        conv.setCreatedAt(LocalDateTime.now());
        conv.setUpdatedAt(LocalDateTime.now());
        conversationRepository.insert(conv);

        return ResponseEntity.ok(conv);
    }

    /**
     * Rename a conversation.
     */
    @PutMapping("/{id}/title")
    public ResponseEntity<?> rename(@PathVariable String id,
                                     @RequestBody Map<String, String> body,
                                     Authentication auth) {
        String userId = requirePrincipal(auth);
        Conversation conv = conversationRepository.selectById(id);
        if (conv == null || !conv.getUserId().equals(userId)) {
            return ResponseEntity.notFound().build();
        }

        String newTitle = body.get("title");
        if (newTitle == null || newTitle.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "title is required"));
        }

        conv.setTitle(newTitle.length() > 50 ? newTitle.substring(0, 50) : newTitle);
        conv.setUpdatedAt(LocalDateTime.now());
        conversationRepository.updateById(conv);

        return ResponseEntity.ok(conv);
    }

    /**
     * Delete a conversation and all its messages.
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<?> delete(@PathVariable String id, Authentication auth) {
        String userId = requirePrincipal(auth);
        Conversation conv = conversationRepository.selectById(id);
        if (conv == null || !conv.getUserId().equals(userId)) {
            return ResponseEntity.notFound().build();
        }

        // Delete all messages in this conversation
        messageRepository.delete(
                new LambdaQueryWrapper<Message>()
                        .eq(Message::getConversationId, id)
        );

        // Delete the conversation itself
        conversationRepository.deleteById(id);

        return ResponseEntity.ok(Map.of("deleted", true));
    }

    /**
     * Delete a single message by id.
     */
    @DeleteMapping("/{convId}/messages/{msgId}")
    public ResponseEntity<?> deleteMessage(@PathVariable String convId,
                                            @PathVariable Long msgId,
                                            Authentication auth) {
        String userId = requirePrincipal(auth);
        Message msg = messageRepository.selectById(msgId);
        if (msg == null || !userId.equals(msg.getUserId())) {
            return ResponseEntity.notFound().build();
        }
        messageRepository.deleteById(msgId);
        return ResponseEntity.ok(Map.of("deleted", true));
    }

    private static String requirePrincipal(Authentication auth) {
        if (auth == null || auth.getName() == null || auth.getName().isBlank()) {
            throw new IllegalStateException("Unauthenticated request");
        }
        return auth.getName();
    }
}
