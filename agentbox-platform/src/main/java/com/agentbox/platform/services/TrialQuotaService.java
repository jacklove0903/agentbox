package com.agentbox.platform.services;

import com.agentbox.platform.exceptions.TrialLimitExceededException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;

@Service
public class TrialQuotaService {

    private static final String FEATURE_CHAT = "chat";
    private static final String FEATURE_SUMMARIZE = "summarize";
    private static final String FEATURE_IMAGE = "image";
    private static final String FEATURE_ENHANCE = "enhance";

    @Value("${trial.chat.limit:10}")
    private int chatLimit;

    @Value("${trial.summarize.limit:5}")
    private int summarizeLimit;

    @Value("${trial.image.limit:3}")
    private int imageLimit;

    @Value("${trial.enhance.limit:5}")
    private int enhanceLimit;

    private final ConcurrentHashMap<String, AtomicInteger> usage = new ConcurrentHashMap<>();

    public boolean isAuthenticated(Authentication auth) {
        return auth != null && auth.getName() != null && !auth.getName().isBlank();
    }

    public String resolveGuestId(String guestIdHeader, String remoteAddr) {
        if (guestIdHeader != null) {
            String trimmed = guestIdHeader.trim();
            if (trimmed.length() >= 8 && trimmed.length() <= 128) {
                return trimmed;
            }
        }
        String ip = (remoteAddr == null || remoteAddr.isBlank()) ? "unknown" : remoteAddr.trim();
        return "ip:" + ip;
    }

    public void consumeOrThrow(Authentication auth, String guestId, String feature) {
        if (isAuthenticated(auth)) {
            return;
        }

        int limit = resolveLimit(feature);
        String actorKey = normalizeActorKey(guestId);
        String key = actorKey + ":" + feature;
        int used = usage.computeIfAbsent(key, k -> new AtomicInteger(0)).incrementAndGet();

        if (used > limit) {
            throw new TrialLimitExceededException(feature, limit, used - 1, 0);
        }
    }

    public Map<String, Object> buildStatus(Authentication auth, String guestId) {
        Map<String, Integer> limits = Map.of(
                FEATURE_CHAT, chatLimit,
                FEATURE_SUMMARIZE, summarizeLimit,
                FEATURE_IMAGE, imageLimit,
                FEATURE_ENHANCE, enhanceLimit
        );

        Map<String, Object> resp = new LinkedHashMap<>();
        boolean authenticated = isAuthenticated(auth);
        resp.put("authenticated", authenticated);

        if (authenticated) {
            resp.put("remaining", Map.of(
                    FEATURE_CHAT, -1,
                    FEATURE_SUMMARIZE, -1,
                    FEATURE_IMAGE, -1,
                    FEATURE_ENHANCE, -1
            ));
            resp.put("limits", limits);
            return resp;
        }

        Map<String, Integer> used = new LinkedHashMap<>();
        Map<String, Integer> remaining = new LinkedHashMap<>();
        String actorKey = normalizeActorKey(guestId);

        for (String feature : limits.keySet()) {
            int limit = limits.get(feature);
            int current = usage.getOrDefault(actorKey + ":" + feature, new AtomicInteger(0)).get();
            used.put(feature, current);
            remaining.put(feature, Math.max(limit - current, 0));
        }

        resp.put("guestId", guestId);
        resp.put("limits", limits);
        resp.put("used", used);
        resp.put("remaining", remaining);
        return resp;
    }

    private int resolveLimit(String feature) {
        return switch (feature) {
            case FEATURE_CHAT -> chatLimit;
            case FEATURE_SUMMARIZE -> summarizeLimit;
            case FEATURE_IMAGE -> imageLimit;
            case FEATURE_ENHANCE -> enhanceLimit;
            default -> chatLimit;
        };
    }

    private String normalizeActorKey(String actorId) {
        if (actorId == null || actorId.isBlank()) {
            return "guest:unknown";
        }
        String trimmed = actorId.trim();
        if (trimmed.startsWith("guest:")) {
            return trimmed;
        }
        return "guest:" + trimmed;
    }
}
