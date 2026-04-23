package com.agentbox.platform.dto;

import lombok.Data;

@Data
public class LoginRequest {
    // Accepts either username or email.
    private String identifier;
    private String password;
}
