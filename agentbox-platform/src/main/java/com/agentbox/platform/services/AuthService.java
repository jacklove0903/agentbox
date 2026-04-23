package com.agentbox.platform.services;

import com.agentbox.platform.dto.AuthResponse;
import com.agentbox.platform.dto.LoginRequest;
import com.agentbox.platform.dto.RegisterRequest;
import com.agentbox.platform.models.User;
import com.agentbox.platform.repositories.UserRepository;
import com.agentbox.platform.security.JwtUtil;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.regex.Pattern;

@Service
public class AuthService {

    private static final Pattern USERNAME_PATTERN = Pattern.compile("^[a-zA-Z0-9_]{3,32}$");
    private static final Pattern EMAIL_PATTERN = Pattern.compile("^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$");

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;

    public AuthService(UserRepository userRepository, PasswordEncoder passwordEncoder, JwtUtil jwtUtil) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtUtil = jwtUtil;
    }

    public AuthResponse register(RegisterRequest req) {
        String username = req.getUsername() == null ? "" : req.getUsername().trim();
        String email = req.getEmail() == null ? "" : req.getEmail().trim().toLowerCase();
        String password = req.getPassword() == null ? "" : req.getPassword();

        if (!USERNAME_PATTERN.matcher(username).matches()) {
            throw new IllegalArgumentException("username must be 3-32 chars of letters/digits/underscore");
        }
        if (!EMAIL_PATTERN.matcher(email).matches()) {
            throw new IllegalArgumentException("invalid email");
        }
        if (password.length() < 6) {
            throw new IllegalArgumentException("password must be at least 6 characters");
        }

        if (userRepository.selectCount(
                new LambdaQueryWrapper<User>().eq(User::getUsername, username)) > 0) {
            throw new IllegalArgumentException("username already taken");
        }
        if (userRepository.selectCount(
                new LambdaQueryWrapper<User>().eq(User::getEmail, email)) > 0) {
            throw new IllegalArgumentException("email already registered");
        }

        User user = new User();
        user.setUsername(username);
        user.setEmail(email);
        user.setPassword(passwordEncoder.encode(password));
        user.setCreatedAt(LocalDateTime.now());
        userRepository.insert(user);

        return buildAuthResponse(user);
    }

    public AuthResponse login(LoginRequest req) {
        String identifier = req.getIdentifier() == null ? "" : req.getIdentifier().trim();
        String password = req.getPassword() == null ? "" : req.getPassword();

        if (identifier.isEmpty() || password.isEmpty()) {
            throw new IllegalArgumentException("identifier and password are required");
        }

        // Look up by username first, then email.
        User user = userRepository.selectOne(
                new LambdaQueryWrapper<User>().eq(User::getUsername, identifier));
        if (user == null) {
            user = userRepository.selectOne(
                    new LambdaQueryWrapper<User>().eq(User::getEmail, identifier.toLowerCase()));
        }
        if (user == null || !passwordEncoder.matches(password, user.getPassword())) {
            throw new IllegalArgumentException("invalid credentials");
        }

        return buildAuthResponse(user);
    }

    private AuthResponse buildAuthResponse(User user) {
        AuthResponse resp = new AuthResponse();
        resp.setToken(jwtUtil.generateToken(user.getUsername()));
        resp.setUsername(user.getUsername());
        resp.setEmail(user.getEmail());
        return resp;
    }
}
