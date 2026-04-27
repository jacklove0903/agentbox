package com.agentbox.platform.config;

import com.agentbox.platform.exceptions.TrialLimitExceededException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.bind.annotation.ExceptionHandler;

import java.util.Map;

@ControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(TrialLimitExceededException.class)
    public ResponseEntity<Map<String, Object>> handleTrialLimitExceeded(TrialLimitExceededException e) {
        return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS).body(Map.of(
                "code", "TRIAL_EXHAUSTED",
                "error", e.getMessage(),
                "feature", e.getFeature(),
                "limit", e.getLimit(),
                "used", e.getUsed(),
                "remaining", e.getRemaining()
        ));
    }

    @ExceptionHandler(RuntimeException.class)
    public ResponseEntity<String> handleRuntimeException(RuntimeException e) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(e.getMessage());
    }
}