package com.agentbox.platform.services;

import com.agentbox.platform.dto.ModelInfo;
import com.agentbox.platform.models.Model;
import com.agentbox.platform.repositories.ModelRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class ModelService {

    @Autowired
    private ModelRepository modelMapper;

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


    public List<Map<String,List<ModelInfo>>> getModelOfMap(){
        List<Model> models = modelMapper.selectList(null);
        Map<String, List<Model>> grouped = models.stream()
            .collect(Collectors.groupingBy(Model::getProvider));
        
        List<Map<String, List<ModelInfo>>> result = new ArrayList<>();
        for (Map.Entry<String, List<Model>> entry : grouped.entrySet()) {
            Map<String, List<ModelInfo>> map = new HashMap<>();
            List<ModelInfo> infos = entry.getValue().stream().map(model -> {
                ModelInfo info = new ModelInfo();
                info.setId(model.getId());
                info.setName(model.getName());
                info.setIcon(model.getIcon() != null ? model.getIcon() : "https://example.com/default-icon.png");
                return info;
            }).collect(Collectors.toList());
            map.put(entry.getKey(), infos);
            result.add(map);
        }
        return result;
    }
}