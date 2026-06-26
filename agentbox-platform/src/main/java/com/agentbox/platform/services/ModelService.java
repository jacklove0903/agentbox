package com.agentbox.platform.services;

import com.agentbox.platform.dto.AvailableModel;
import com.agentbox.platform.dto.ModelInfo;
import com.agentbox.platform.models.Model;
import com.agentbox.platform.repositories.ModelRepository;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class ModelService {

    private static final Logger log = LoggerFactory.getLogger(ModelService.class);

    @Autowired
    private ModelRepository modelMapper;

    @Autowired
    private ChatService chatService;

    @Autowired
    private ObjectMapper objectMapper;

    @Value("${spring.ai.openai.api-key}")
    private String apiKey;

    @Value("${spring.ai.openai.base-url}")
    private String baseUrl;

    private final HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(10))
            .build();

    /** Vendor → icon URL mapping for known SiliconFlow providers. */
    private static final Map<String, String> VENDOR_ICONS = Map.ofEntries(
            Map.entry("Qwen", "https://sf-maas-uat-prod.oss-cn-shanghai.aliyuncs.com/Model_LOGO/Tongyi.svg"),
            Map.entry("deepseek-ai", "https://sf-maas-uat-prod.oss-cn-shanghai.aliyuncs.com/Model_LOGO/DeepSeek.svg"),
            Map.entry("Pro/MiniMaxAI", "https://sf-maas-uat-prod.oss-cn-shanghai.aliyuncs.com/Model_LOGO/minimax-color.svg"),
            Map.entry("THUDM", "https://sf-maas-uat-prod.oss-cn-shanghai.aliyuncs.com/Model_LOGO/zhipu-color.svg"),
            Map.entry("Pro/LoRA", "https://sf-maas-uat-prod.oss-cn-shanghai.aliyuncs.com/Model_LOGO/01-ai.svg"),
            Map.entry("meta-llama", "https://sf-maas-uat-prod.oss-cn-shanghai.aliyuncs.com/Model_LOGO/Meta.svg"),
            Map.entry("InternLM", "https://sf-maas-uat-prod.oss-cn-shanghai.aliyuncs.com/Model_LOGO/internlm.svg"),
            Map.entry("mistralai", "https://sf-maas-uat-prod.oss-cn-shanghai.aliyuncs.com/Model_LOGO/Mistral.svg"),
            Map.entry("Pro/TeleAI", "https://sf-maas-uat-prod.oss-cn-shanghai.aliyuncs.com/Model_LOGO/teleai.svg"),
            Map.entry("Pro/01-ai", "https://sf-maas-uat-prod.oss-cn-shanghai.aliyuncs.com/Model_LOGO/01-ai.svg")
    );

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

    // ──────────────────── SiliconFlow model catalogue ────────────────────

    /**
     * Fetch available models from SiliconFlow /v1/models and group by vendor.
     * Returns a map of vendor → list of available models.
     */
    public Map<String, List<AvailableModel>> getSiliconFlowModels() {
        String url = baseUrl + "/v1/models";
        log.info("Fetching SiliconFlow model catalogue: {}", url);
        try {
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(url))
                    .header("Authorization", "Bearer " + apiKey)
                    .GET()
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());

            if (response.statusCode() != 200) {
                log.warn("SiliconFlow /v1/models returned status {} body: {}",
                        response.statusCode(),
                        response.body().length() > 300 ? response.body().substring(0, 300) : response.body());
                return Map.of();
            }

            JsonNode root = objectMapper.readTree(response.body());
            JsonNode data = root.get("data");
            if (data == null || !data.isArray()) {
                log.warn("SiliconFlow /v1/models response missing 'data' array");
                return Map.of();
            }

            Map<String, List<AvailableModel>> grouped = new LinkedHashMap<>();

            for (JsonNode node : data) {
                String id = node.has("id") ? node.get("id").asText() : null;
                String ownedBy = node.has("owned_by") && !node.get("owned_by").asText().isBlank()
                        ? node.get("owned_by").asText()
                        : "";
                if (id == null || id.isBlank()) continue;

                // Skip non-chat models (embedding, reranker, etc.)
                if (isNonChatModel(id)) continue;

                // Fallback: extract vendor from model ID when owned_by is empty
                // e.g. "deepseek-ai/DeepSeek-V4-Pro" → "deepseek-ai"
                // e.g. "Pro/moonshotai/Kimi-K2.6" → "moonshotai"
                if (ownedBy.isBlank()) {
                    int slash = id.indexOf('/');
                    if (slash >= 0) {
                        ownedBy = id.substring(0, slash);
                        // If the first segment is "Pro", skip to the next segment
                        if ("Pro".equals(ownedBy)) {
                            int secondSlash = id.indexOf('/', slash + 1);
                            if (secondSlash >= 0) {
                                ownedBy = id.substring(slash + 1, secondSlash);
                            }
                        }
                    } else {
                        ownedBy = "Other";
                    }
                }
                // Strip "Pro/" prefix for cleaner grouping (when owned_by comes from API)
                // e.g. "Pro/moonshotai" → "moonshotai"
                if (ownedBy.startsWith("Pro/")) {
                    ownedBy = ownedBy.substring(4);
                }

                AvailableModel am = new AvailableModel();
                am.setId(id);
                am.setName(modelDisplayName(id));
                am.setIcon(getVendorIcon(ownedBy));
                am.setSupportsVision(isVisionModel(id));

                grouped.computeIfAbsent(ownedBy, k -> new java.util.ArrayList<>()).add(am);
            }

            log.info("SiliconFlow catalogue: {} vendors, {} models total",
                    grouped.size(),
                    grouped.values().stream().mapToInt(List::size).sum());
            return grouped;
        } catch (java.net.http.HttpTimeoutException e) {
            log.error("SiliconFlow request timed out: {}", url);
            return Map.of();
        } catch (Exception e) {
            log.error("Failed to fetch SiliconFlow models: {} — {}", e.getClass().getSimpleName(), e.getMessage());
            return Map.of();
        }
    }

    /** Derive a human-readable display name from the model ID. */
    private static String modelDisplayName(String modelId) {
        // Take the part after the LAST slash, e.g.:
        // "Qwen/Qwen3-8B" → "Qwen3-8B"
        // "Pro/moonshotai/Kimi-K2.6" → "Kimi-K2.6"
        int slash = modelId.lastIndexOf('/');
        String name = slash >= 0 ? modelId.substring(slash + 1) : modelId;
        return name.replace(":free", "").trim();
    }

    /** Filter out embedding, reranker, and other utility models. */
    private static boolean isNonChatModel(String id) {
        String lower = id.toLowerCase();
        return lower.contains("embedding")
                || lower.contains("bge-")
                || lower.contains("reranker")
                || lower.contains("bce-")
                || lower.contains("stablediffusion")
                || lower.contains("flux");
    }

    /** Guess whether a model supports vision based on its ID. */
    private static boolean isVisionModel(String id) {
        String lower = id.toLowerCase();
        return lower.contains("-vl")
                || lower.contains("vision")
                || lower.contains("vl-");
    }

    /** Get icon URL for a vendor, with fallback. */
    private static String getVendorIcon(String ownedBy) {
        return VENDOR_ICONS.getOrDefault(ownedBy,
                "https://sf-maas-uat-prod.oss-cn-shanghai.aliyuncs.com/Model_LOGO/default.svg");
    }
}