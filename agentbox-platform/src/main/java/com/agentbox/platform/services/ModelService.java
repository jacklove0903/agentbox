package com.agentbox.platform.services;

import com.agentbox.platform.dto.ModelInfo;
import com.agentbox.platform.models.Model;
import com.agentbox.platform.repositories.ModelMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

@Service
public class ModelService {

    @Autowired
    private ModelMapper modelMapper;

    public List<ModelInfo> getAvailableModels() {
        List<Model> models = modelMapper.selectList(null);
        return models.stream().map(model -> {
            ModelInfo info = new ModelInfo();
            info.setId(model.getId());
            info.setName(model.getName());
            info.setIcon(model.getIcon());
            return info;
        }).collect(Collectors.toList());
    }
}