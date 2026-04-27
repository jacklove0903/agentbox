package com.agentbox.platform.services;

import com.agentbox.platform.dto.ModelInfo;
import com.agentbox.platform.models.Model;
import com.agentbox.platform.repositories.ModelRepository;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class ModelService {

    @Autowired
    private ModelRepository modelMapper;

    @Autowired
    private ChatService chatService;

    public List<ModelInfo> getAvailableModels() {
        List<Model> models = modelMapper.selectList(
                new LambdaQueryWrapper<Model>()
                        .eq(Model::getEnabled, true)
                        .orderByAsc(Model::getSortOrder)
        );
        return models.stream().map(this::toModelInfo).collect(Collectors.toList());
    }

    public Map<String, List<ModelInfo>> getModelOfMap() {
        List<Model> models = modelMapper.selectList(
                new LambdaQueryWrapper<Model>()
                        .eq(Model::getEnabled, true)
                        .orderByAsc(Model::getSortOrder)
        );
        return models.stream()
                .map(this::toModelInfo)
                .collect(Collectors.groupingBy(
                        ModelInfo::getProvider,
                        LinkedHashMap::new,
                        Collectors.toList()
                ));
    }

    public ModelInfo createModel(String id,
                                 String name,
                                 String icon,
                                 String provider,
                                 String modelName,
                                 Boolean supportsVision) {
        String normalizedId = requireText(id, "id");
        String normalizedName = requireText(name, "name");
        String normalizedProvider = requireText(provider, "provider");
        String normalizedModelName = requireText(modelName, "modelName");

        Model existing = modelMapper.selectById(normalizedId);
        if (existing != null) {
            throw new IllegalArgumentException("Model already exists: " + normalizedId);
        }

        List<Model> all = modelMapper.selectList(new LambdaQueryWrapper<Model>());
        int nextSort = all.stream()
                .map(Model::getSortOrder)
                .filter(v -> v != null)
                .max(Comparator.naturalOrder())
                .orElse(0) + 1;

        Model model = new Model();
        model.setId(normalizedId);
        model.setName(normalizedName);
        model.setIcon((icon == null || icon.isBlank()) ? "" : icon.trim());
        model.setProvider(normalizedProvider);
        model.setModelName(normalizedModelName);
        model.setEnabled(true);
        model.setSortOrder(nextSort);
        model.setSupportsVision(Boolean.TRUE.equals(supportsVision));

        modelMapper.insert(model);
        chatService.clearModelNameCache();
        return toModelInfo(model);
    }

    public void deleteModel(String id) {
        String normalizedId = requireText(id, "id");
        int affected = modelMapper.deleteById(normalizedId);
        if (affected == 0) {
            throw new IllegalArgumentException("Model not found: " + normalizedId);
        }
        chatService.clearModelNameCache();
    }

    private String requireText(String value, String field) {
        if (value == null || value.isBlank()) {
            throw new IllegalArgumentException(field + " is required");
        }
        return value.trim();
    }

    private ModelInfo toModelInfo(Model model) {
        ModelInfo info = new ModelInfo();
        info.setId(model.getId());
        info.setName(model.getName());
        info.setIcon(model.getIcon());
        info.setProvider(model.getProvider());
        info.setSupportsVision(Boolean.TRUE.equals(model.getSupportsVision()));
        return info;
    }
}