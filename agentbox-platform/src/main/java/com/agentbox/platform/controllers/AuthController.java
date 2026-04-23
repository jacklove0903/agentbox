package com.agentbox.platform.controllers;

import com.agentbox.platform.dto.AuthResponse;
import com.agentbox.platform.dto.LoginRequest;
import com.agentbox.platform.dto.RegisterRequest;
import com.agentbox.platform.services.AuthService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/register")
    public ResponseEntity<AuthResponse> register(@RequestBody RegisterRequest request) {
        return ResponseEntity.ok(authService.register(request));
    }

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@RequestBody LoginRequest request) {
        return ResponseEntity.ok(authService.login(request));
    }

    /** Returns info about the currently authenticated user, for the frontend to verify a token. */
    @GetMapping("/me")
    public ResponseEntity<Map<String, String>> me(Authentication auth) {
        if (auth == null || auth.getName() == null) {
            return ResponseEntity.status(401).build();
        }
        return ResponseEntity.ok(Map.of("username", auth.getName()));
    }
}
