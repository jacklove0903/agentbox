package com.agentbox.platform.controllers;

import com.agentbox.platform.dto.ModelInfo;
import com.agentbox.platform.services.ModelService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;

import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/models")
public class ModelController {

    @Autowired
    private ModelService modelService;

    @GetMapping("/getmodels")
    public ResponseEntity<List<ModelInfo>> getModels() {
        List<ModelInfo> models = modelService.getAvailableModels();
        return ResponseEntity.ok(models);
    }


    @GetMapping("/getmodelmap")
    public ResponseEntity<Map<String, List<ModelInfo>>> getModelMap() {
        Map<String, List<ModelInfo>> modelMap = modelService.getModelOfMap();
        return ResponseEntity.ok(modelMap);
    }

    @PostMapping
    public ResponseEntity<?> createModel(@RequestBody Map<String, Object> body, Authentication auth) {
        if (!isAuthenticated(auth)) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "login required"));
        }
        try {
            ModelInfo created = modelService.createModel(
                    valueAsString(body.get("id")),
                    valueAsString(body.get("name")),
                    valueAsString(body.get("icon")),
                    valueAsString(body.get("provider")),
                    valueAsString(body.get("modelName")),
                    valueAsBoolean(body.get("supportsVision"))
            );
            return ResponseEntity.ok(created);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteModel(@PathVariable String id, Authentication auth) {
        if (!isAuthenticated(auth)) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "login required"));
        }
        try {
            modelService.deleteModel(id);
            return ResponseEntity.ok(Map.of("deleted", true));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    private static String valueAsString(Object value) {
        return value == null ? null : String.valueOf(value);
    }

    private static Boolean valueAsBoolean(Object value) {
        if (value == null) return null;
        if (value instanceof Boolean b) return b;
        return Boolean.parseBoolean(String.valueOf(value));
    }

    private static boolean isAuthenticated(Authentication auth) {
        return auth != null && auth.isAuthenticated() && auth.getName() != null && !auth.getName().isBlank();
    }
}