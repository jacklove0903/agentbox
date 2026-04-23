package com.agentbox.platform.services;

import com.agentbox.platform.models.ImageGeneration;
import com.agentbox.platform.repositories.ImageGenerationRepository;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
public class ImageGenService {

    @Value("${spring.ai.openai.api-key}")
    private String apiKey;

    @Value("${spring.ai.openai.base-url}")
    private String baseUrl;

    @Autowired
    private ImageGenerationRepository imageGenRepository;

    @Autowired
    private ObjectMapper objectMapper;

    private final HttpClient httpClient = HttpClient.newHttpClient();

    /**
     * Call SiliconFlow image generation API, save the result to DB, and return the record.
     */
    public ImageGeneration generate(String userId, String prompt, String model, String size) throws Exception {
        // Build request body per SiliconFlow API spec
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("model", model);
        body.put("prompt", prompt);

        body.put("image_size", size);
        body.put("num_inference_steps", 20);

        // Qwen-Image uses "cfg"; Kolors uses "guidance_scale"
        if (model.startsWith("Qwen/")) {
            body.put("cfg", 4);
        } else {
            body.put("guidance_scale", 7.5);
        }

        String jsonBody = objectMapper.writeValueAsString(body);

        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(baseUrl + "/v1/images/generations"))
                .header("Authorization", "Bearer " + apiKey)
                .header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(jsonBody))
                .build();

        HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());

        if (response.statusCode() != 200) {
            throw new RuntimeException("图片生成 API 返回错误 (" + response.statusCode() + "): " + response.body());
        }

        // Parse response — SiliconFlow returns { "images": [{ "url": "..." }] }
        JsonNode root = objectMapper.readTree(response.body());
        JsonNode imagesArr = root.get("images");
        if (imagesArr == null || !imagesArr.isArray() || imagesArr.isEmpty()) {
            throw new RuntimeException("图片生成 API 未返回图片数据: " + response.body());
        }

        String imageUrl = imagesArr.get(0).has("url")
                ? imagesArr.get(0).get("url").asText()
                : null;

        if (imageUrl == null || imageUrl.isBlank()) {
            throw new RuntimeException("图片生成 API 未返回有效的图片 URL");
        }

        // Save to DB
        ImageGeneration record = new ImageGeneration();
        record.setUserId(userId);
        record.setPrompt(prompt);
        record.setModel(model);
        record.setSize(size);
        record.setImageUrl(imageUrl);
        imageGenRepository.insert(record);

        return record;
    }

    /**
     * Return user's image generation history, newest first.
     */
    public List<ImageGeneration> getHistory(String userId, int limit) {
        return imageGenRepository.selectList(
                new LambdaQueryWrapper<ImageGeneration>()
                        .eq(ImageGeneration::getUserId, userId)
                        .orderByDesc(ImageGeneration::getCreatedAt)
                        .last("LIMIT " + Math.min(limit, 50))
        );
    }
}
