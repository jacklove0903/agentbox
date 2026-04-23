package com.agentbox.platform.controllers;

import com.agentbox.platform.models.ModelVote;
import com.agentbox.platform.repositories.ModelVoteRepository;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/votes")
public class VoteController {

    @Autowired
    private ModelVoteRepository voteRepository;

    /**
     * Cast a vote for the best model response.
     * Body: { "modelId": "xxx", "conversationId": "yyy", "userMessage": "zzz" }
     */
    @PostMapping
    public ResponseEntity<?> vote(@RequestBody Map<String, String> body, Authentication auth) {
        String userId = requirePrincipal(auth);
        String modelId = body.get("modelId");
        if (modelId == null || modelId.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "modelId is required"));
        }

        ModelVote vote = new ModelVote();
        vote.setUserId(userId);
        vote.setModelId(modelId.trim());
        vote.setConversationId(body.get("conversationId"));
        vote.setUserMessage(body.get("userMessage"));
        vote.setCreatedAt(LocalDateTime.now());
        voteRepository.insert(vote);

        return ResponseEntity.ok(Map.of("success", true));
    }

    /**
     * Get vote statistics for the current user.
     * Returns: [ { "modelId": "xxx", "votes": 10, "winRate": 0.35 }, ... ]
     */
    @GetMapping("/stats")
    public ResponseEntity<?> stats(Authentication auth) {
        String userId = requirePrincipal(auth);

        List<ModelVote> allVotes = voteRepository.selectList(
                new LambdaQueryWrapper<ModelVote>()
                        .eq(ModelVote::getUserId, userId)
        );

        if (allVotes.isEmpty()) {
            return ResponseEntity.ok(Collections.emptyList());
        }

        long totalVotes = allVotes.size();

        // Group by modelId and count
        Map<String, Long> voteCounts = allVotes.stream()
                .collect(Collectors.groupingBy(ModelVote::getModelId, Collectors.counting()));

        List<Map<String, Object>> stats = voteCounts.entrySet().stream()
                .sorted(Map.Entry.<String, Long>comparingByValue().reversed())
                .map(entry -> {
                    Map<String, Object> stat = new LinkedHashMap<>();
                    stat.put("modelId", entry.getKey());
                    stat.put("votes", entry.getValue());
                    stat.put("winRate", Math.round(entry.getValue() * 1000.0 / totalVotes) / 1000.0);
                    return stat;
                })
                .toList();

        return ResponseEntity.ok(stats);
    }

    private static String requirePrincipal(Authentication auth) {
        if (auth == null || auth.getName() == null || auth.getName().isBlank()) {
            throw new IllegalStateException("Unauthenticated request");
        }
        return auth.getName();
    }
}
