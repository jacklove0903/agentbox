package com.agentbox.platform.services;

import com.agentbox.platform.dto.ModelInfo;
import org.springframework.stereotype.Service;

import java.util.Arrays;
import java.util.List;

@Service
public class ModelService {

    public List<ModelInfo> getAvailableModels() {
        ModelInfo ernie = new ModelInfo();
        ernie.setId("ernie-4.0");
        ernie.setName("Ernie 4.0");
        ernie.setIcon("ernie-icon.png");

        ModelInfo tongyi = new ModelInfo();
        tongyi.setId("tongyi-qianwen-2.5");
        tongyi.setName("Tongyi Qianwen 2.5");
        tongyi.setIcon("tongyi-icon.png");

        return Arrays.asList(ernie, tongyi);
    }
}