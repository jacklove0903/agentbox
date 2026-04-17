package com.agentbox.platform.controllers;

import com.agentbox.platform.dto.ModelInfo;
import com.agentbox.platform.services.ModelService;
import org.springframework.ai.chat.model.ChatModel;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/models")
public class ModelController {

    @Autowired
    private ModelService modelService;

    @Autowired
    private ChatModel chatModel;

    @GetMapping("/getmodels")
    public ResponseEntity<List<ModelInfo>> getModels() {
        List<ModelInfo> models = modelService.getAvailableModels();
        return ResponseEntity.ok(models);
    }


    @GetMapping("/getmodelmap")
    public ResponseEntity<List<Map<String, List<ModelInfo>>>> getModelMap() {
        List<Map<String, List<ModelInfo>>> modelMap = modelService.getModelOfMap();
        return ResponseEntity.ok(modelMap);
    }
}