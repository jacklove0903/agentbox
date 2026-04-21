package com.agentbox.platform.services;

import com.agentbox.platform.dto.ModelInfo;
import com.agentbox.platform.models.Model;
import com.agentbox.platform.repositories.ModelRepository;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class ModelService {

    @Autowired
    private ModelRepository modelMapper;

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

    private ModelInfo toModelInfo(Model model) {
        ModelInfo info = new ModelInfo();
        info.setId(model.getId());
        info.setName(model.getName());
        info.setIcon(model.getIcon());
        info.setProvider(model.getProvider());
        return info;
    }
}