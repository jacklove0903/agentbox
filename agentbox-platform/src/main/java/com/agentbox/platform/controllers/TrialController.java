package com.agentbox.platform.controllers;

import com.agentbox.platform.services.TrialQuotaService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/trial")
public class TrialController {

    private final TrialQuotaService trialQuotaService;

    public TrialController(TrialQuotaService trialQuotaService) {
        this.trialQuotaService = trialQuotaService;
    }

    @GetMapping("/status")
    public ResponseEntity<Map<String, Object>> status(
            Authentication auth,
            @RequestHeader(value = "X-Guest-Id", required = false) String guestIdHeader,
            HttpServletRequest request) {
        String guestId = trialQuotaService.resolveGuestId(guestIdHeader, request.getRemoteAddr());
        return ResponseEntity.ok(trialQuotaService.buildStatus(auth, guestId));
    }
}
