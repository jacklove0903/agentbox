package com.agentbox.platform.services;

import com.agentbox.platform.dto.ChatHistoryRequest;
import com.agentbox.platform.dto.ChatHistoryResponse;
import com.agentbox.platform.dto.MessageRequest;
import com.agentbox.platform.dto.MessageResponse;
import com.agentbox.platform.models.Conversation;
import com.agentbox.platform.models.Message;
import com.agentbox.platform.models.Model;
import com.agentbox.platform.repositories.ConversationRepository;
import com.agentbox.platform.repositories.MessageRepository;
import com.agentbox.platform.repositories.ModelRepository;
import org.springframework.ai.openai.OpenAiChatOptions;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.annotation.PreDestroy;
import org.springframework.ai.chat.messages.AssistantMessage;
import org.springframework.ai.chat.messages.SystemMessage;
import org.springframework.ai.chat.messages.UserMessage;
import org.springframework.ai.chat.model.ChatModel;
import org.springframework.ai.chat.model.ChatResponse;
import org.springframework.ai.chat.prompt.Prompt;
import org.springframework.ai.content.Media;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.codec.ServerSentEvent;
import org.springframework.stereotype.Service;
import org.springframework.util.MimeTypeUtils;
import reactor.core.publisher.Flux;

import java.time.LocalDateTime;
import java.util.*;
import java.util.concurrent.*;

@Service
public class ChatService {

    private static final int MAX_HISTORY_MESSAGES = 20;

    @Autowired
    private ChatModel chatModel;

    @Autowired
    private MessageRepository messageRepository;

    @Autowired
    private ModelRepository modelRepository;

    @Autowired
    private ConversationRepository conversationRepository;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private WebSearchService webSearchService;

    @Autowired
    private com.agentbox.platform.repositories.UploadedFileRepository uploadedFileRepository;

    private final ExecutorService modelExecutor = Executors.newFixedThreadPool(
            Math.max(32, Runtime.getRuntime().availableProcessors() * 4));

    // In-memory cache for model name resolution (modelId -> apiModelName)
    private final ConcurrentHashMap<String, String> modelNameCache = new ConcurrentHashMap<>();
    // In-memory cache for vision capability (modelId -> supports images)
    private final ConcurrentHashMap<String, Boolean> modelVisionCache = new ConcurrentHashMap<>();

    @PreDestroy
    public void shutdown() {
        modelExecutor.shutdown();
    }

    public MessageResponse chat(MessageRequest request) {
        if (request == null) throw new IllegalArgumentException("request is required");
        if (request.getMessage() == null || request.getMessage().trim().isEmpty()) {
            throw new IllegalArgumentException("message is required");
        }
        if (request.getModelIds() == null || request.getModelIds().isEmpty()) {
            throw new IllegalArgumentException("modelIds is required");
        }

        String userId = request.getUserId() == null || request.getUserId().isBlank()
                ? "anonymous"
                : request.getUserId().trim();
        String trimmedMessage = request.getMessage().trim();

        List<String> validModelIds = request.getModelIds().stream()
                .filter(id -> id != null && !id.isBlank())
                .map(String::trim)
                .distinct()
                .toList();

        if (validModelIds.isEmpty()) {
            throw new IllegalArgumentException("no valid modelIds provided");
        }

        // Submit all model calls in parallel
        Map<String, CompletableFuture<MessageResponse.ModelResponse>> futures = new LinkedHashMap<>();
        for (String modelId : validModelIds) {
            futures.put(modelId, CompletableFuture.supplyAsync(
                    () -> callSingleModel(userId, modelId, trimmedMessage), modelExecutor));
        }

        // Collect results — each model is independently resolved
        Map<String, MessageResponse.ModelResponse> responses = new LinkedHashMap<>();
        futures.forEach((mid, future) -> {
            try {
                responses.put(mid, future.get(120, TimeUnit.SECONDS));
            } catch (TimeoutException e) {
                MessageResponse.ModelResponse mr = new MessageResponse.ModelResponse();
                mr.setError("Request timed out");
                mr.setTimestamp(LocalDateTime.now());
                responses.put(mid, mr);
            } catch (Exception e) {
                MessageResponse.ModelResponse mr = new MessageResponse.ModelResponse();
                mr.setError("Unexpected error: " + e.getMessage());
                mr.setTimestamp(LocalDateTime.now());
                responses.put(mid, mr);
            }
        });

        MessageResponse resp = new MessageResponse();
        resp.setResponses(responses);
        return resp;
    }

    /**
     * Handles a single model call with full conversation context and error isolation.
     */
    private MessageResponse.ModelResponse callSingleModel(String userId, String modelId, String userMessage) {
        try {
            // 1. Fetch recent conversation history from DB
            List<Message> history = messageRepository.selectList(
                    new LambdaQueryWrapper<Message>()
                            .eq(Message::getUserId, userId)
                            .eq(Message::getModelId, modelId)
                            .orderByDesc(Message::getTimestamp)
                            .last("limit " + MAX_HISTORY_MESSAGES)
            );
            Collections.reverse(history);

            // 2. Build multi-turn conversation messages for the LLM
            List<org.springframework.ai.chat.messages.Message> conversationMessages = new ArrayList<>();
            for (Message msg : history) {
                if (msg.getRole() == Message.Role.USER) {
                    conversationMessages.add(new UserMessage(msg.getContent()));
                } else {
                    conversationMessages.add(new AssistantMessage(msg.getContent()));
                }
            }
            // Append the current user message
            conversationMessages.add(new UserMessage(userMessage));

            // 3. Persist user message
            Message userMsg = new Message();
            userMsg.setUserId(userId);
            userMsg.setModelId(modelId);
            userMsg.setRole(Message.Role.USER);
            userMsg.setContent(userMessage);
            userMsg.setTimestamp(LocalDateTime.now());
            messageRepository.insert(userMsg);

            // 4. Call model with full conversation context
            String apiModelName = resolveModelName(modelId);
            OpenAiChatOptions options = OpenAiChatOptions.builder().model(apiModelName).build();
            ChatResponse chatResponse = chatModel.call(new Prompt(conversationMessages, options));
            String content = chatResponse.getResult().getOutput().getText();

            // 5. Persist AI response
            Message aiMsg = new Message();
            aiMsg.setUserId(userId);
            aiMsg.setModelId(modelId);
            aiMsg.setRole(Message.Role.AI);
            aiMsg.setContent(content);
            aiMsg.setTimestamp(LocalDateTime.now());
            messageRepository.insert(aiMsg);

            // 6. Build response
            MessageResponse.ModelResponse mr = new MessageResponse.ModelResponse();
            mr.setContent(content);
            mr.setTimestamp(aiMsg.getTimestamp());
            return mr;
        } catch (Exception e) {
            // Error isolation: return error per-model instead of failing the entire request
            MessageResponse.ModelResponse mr = new MessageResponse.ModelResponse();
            mr.setError("Model call failed: " + e.getMessage());
            mr.setTimestamp(LocalDateTime.now());
            return mr;
        }
    }

    // ======================== SSE Streaming ========================

    public Flux<ServerSentEvent<String>> chatStream(MessageRequest request) {
        if (request == null) throw new IllegalArgumentException("request is required");
        if (request.getMessage() == null || request.getMessage().trim().isEmpty()) {
            throw new IllegalArgumentException("message is required");
        }
        if (request.getModelIds() == null || request.getModelIds().isEmpty()) {
            throw new IllegalArgumentException("modelIds is required");
        }

        String userId = request.getUserId() == null || request.getUserId().isBlank()
                ? "anonymous" : request.getUserId().trim();
        String trimmedMessage = request.getMessage().trim();

        List<String> validModelIds = request.getModelIds().stream()
                .filter(id -> id != null && !id.isBlank())
                .map(String::trim)
                .distinct()
                .toList();

        if (validModelIds.isEmpty()) {
            throw new IllegalArgumentException("no valid modelIds provided");
        }

        // Extract webSearch option
        boolean webSearch = false;
        boolean enableThinking = true; // default ON so reasoning models (Qwen3) show thinking
        if (request.getOptions() != null) {
            Object ws = request.getOptions().get("webSearch");
            webSearch = Boolean.TRUE.equals(ws) || "true".equals(String.valueOf(ws));
            Object et = request.getOptions().get("enableThinking");
            if (et != null) {
                enableThinking = Boolean.TRUE.equals(et) || "true".equals(String.valueOf(et));
            }
        }
        boolean finalWebSearch = webSearch;
        boolean finalEnableThinking = enableThinking;
        boolean ephemeral = Boolean.TRUE.equals(request.getEphemeral());

        // Ephemeral requests (translator, prompt-enhancer, …) run stateless: no conversation,
        // no persisted messages, no smart title. They must always have a conversationId though
        // because downstream code expects non-null; use a per-request throwaway UUID that is
        // never inserted into the DB.
        String conversationId;
        if (ephemeral) {
            conversationId = "ephemeral-" + UUID.randomUUID();
        } else if (request.getConversationId() == null || request.getConversationId().isBlank()) {
            // Auto-create a new conversation with temporary title
            Conversation conv = new Conversation();
            conv.setId(UUID.randomUUID().toString());
            conv.setUserId(userId);
            String title = trimmedMessage.length() > 30
                    ? trimmedMessage.substring(0, 30) + "..."
                    : trimmedMessage;
            conv.setTitle(title);
            conv.setCreatedAt(LocalDateTime.now());
            conv.setUpdatedAt(LocalDateTime.now());
            conversationRepository.insert(conv);
            conversationId = conv.getId();
        } else {
            conversationId = request.getConversationId();
            // Touch updatedAt
            Conversation conv = conversationRepository.selectById(conversationId);
            if (conv != null) {
                conv.setUpdatedAt(LocalDateTime.now());
                conversationRepository.updateById(conv);
            }
        }
        String finalConversationId = conversationId;

        // Send the conversationId back to the client as the first SSE event
        List<Flux<ServerSentEvent<String>>> modelFluxes = new ArrayList<>();
        if (!ephemeral) {
            // Emit a meta event with the conversationId so the client can track it
            Flux<ServerSentEvent<String>> metaFlux = Flux.just(
                    buildConversationIdEvent(finalConversationId));
            modelFluxes.add(metaFlux);
        }

        List<String> imageUrls = request.getImageUrls() != null ? request.getImageUrls() : List.of();

        validModelIds.stream()
                .map(modelId -> streamSingleModel(userId, modelId, trimmedMessage,
                        finalWebSearch, finalConversationId, imageUrls, finalEnableThinking, ephemeral))
                .forEach(modelFluxes::add);

        // Smart title only for persisted conversations.
        if (!ephemeral && claimSmartTitleSlot(finalConversationId)) {
            String msgForTitle = trimmedMessage;
            modelFluxes.add(generateSmartTitle(finalConversationId, msgForTitle));
        }

        return Flux.merge(modelFluxes);
    }

    /**
     * Atomically flip {@code smart_title_generated} from false→true for the given conversation.
     * Returns true if THIS call won the race and should generate the title.
     */
    private boolean claimSmartTitleSlot(String conversationId) {
        Conversation update = new Conversation();
        update.setSmartTitleGenerated(true);
        int rows = conversationRepository.update(update,
                new com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper<Conversation>()
                        .eq(Conversation::getId, conversationId)
                        .and(w -> w.isNull(Conversation::getSmartTitleGenerated)
                                .or()
                                .eq(Conversation::getSmartTitleGenerated, false)));
        return rows > 0;
    }

    private Flux<ServerSentEvent<String>> streamSingleModel(String userId, String modelId,
                                                               String userMessage, boolean webSearch,
                                                               String conversationId, List<String> imageUrls,
                                                               boolean enableThinking, boolean ephemeral) {
        return Flux.<ServerSentEvent<String>>create(sink -> {
            modelExecutor.submit(() -> {
                try {
                    // 1. Fetch history scoped to conversation + model.
                    //    Skip history entirely for ephemeral (tool) requests — they must not
                    //    leak context from the user's real conversations.
                    List<Message> history;
                    if (ephemeral) {
                        history = List.of();
                    } else {
                        LambdaQueryWrapper<Message> historyQuery = new LambdaQueryWrapper<Message>()
                                .eq(Message::getUserId, userId)
                                .eq(Message::getModelId, modelId);
                        if (conversationId != null && !conversationId.isBlank()) {
                            historyQuery.eq(Message::getConversationId, conversationId);
                        }
                        historyQuery.orderByDesc(Message::getTimestamp)
                                .last("limit " + MAX_HISTORY_MESSAGES);
                        history = messageRepository.selectList(historyQuery);
                        Collections.reverse(history);
                    }

                    // 2. Build conversation
                    List<org.springframework.ai.chat.messages.Message> conversationMessages = new ArrayList<>();
                    for (Message msg : history) {
                        if (msg.getRole() == Message.Role.USER) {
                            conversationMessages.add(new UserMessage(msg.getContent()));
                        } else {
                            conversationMessages.add(new AssistantMessage(msg.getContent()));
                        }
                    }
                    // Build user message — attach images as Media only if the model supports
                    // vision (otherwise SiliconFlow returns 400 for text-only models).
                    boolean canSeeImages = modelSupportsVision(modelId);
                    List<Media> mediaList = canSeeImages ? loadImageMedia(imageUrls) : List.of();
                    if (!mediaList.isEmpty()) {
                        conversationMessages.add(UserMessage.builder()
                                .text(userMessage)
                                .media(mediaList)
                                .build());
                    } else if (!canSeeImages && imageUrls != null && !imageUrls.isEmpty()) {
                        // Non-vision model with attached images: tell it so it responds
                        // helpfully instead of answering a question about an image it can't see.
                        String note = "[系统提示：用户附带了 " + imageUrls.size()
                                + " 张图片，但当前模型不支持图像识别。请告知用户并尝试仅基于文字部分回答。]\n\n";
                        conversationMessages.add(new UserMessage(note + userMessage));
                    } else {
                        conversationMessages.add(new UserMessage(userMessage));
                    }

                    // 2.5 Web Search: search and inject results as system context
                    if (webSearch) {
                        sink.next(buildSseEvent(modelId, "", false, null, true));
                        try {
                            var searchResults = webSearchService.search(userMessage);
                            String searchContext = webSearchService.buildSearchContext(searchResults);
                            conversationMessages.add(0, new SystemMessage(searchContext));
                        } catch (Exception e) {
                            conversationMessages.add(0, new SystemMessage(
                                    "网络搜索失败（" + e.getMessage() + "），请基于你的知识回答用户的问题。"));
                        }
                    }

                    // 3. Save user message (include attached image URLs so they
                    //    re-appear when the conversation is reloaded later).
                    //    Ephemeral requests do not persist.
                    if (!ephemeral) {
                        Message userMsg = new Message();
                        userMsg.setUserId(userId);
                        userMsg.setConversationId(conversationId);
                        userMsg.setModelId(modelId);
                        userMsg.setRole(Message.Role.USER);
                        userMsg.setContent(userMessage);
                        if (imageUrls != null && !imageUrls.isEmpty()) {
                            try {
                                userMsg.setImageUrls(objectMapper.writeValueAsString(imageUrls));
                            } catch (Exception ignore) { /* fall through, content still saved */ }
                        }
                        userMsg.setTimestamp(LocalDateTime.now());
                        messageRepository.insert(userMsg);
                    }

                    // 4. Stream from model — each model runs on its own thread for true parallelism
                    StringBuilder fullContent = new StringBuilder();
                    String apiModelName = resolveModelName(modelId);
                    OpenAiChatOptions.Builder optsBuilder = OpenAiChatOptions.builder().model(apiModelName);
                    // enable_thinking is a Qwen3-specific SiliconFlow extension. Sending it to
                    // other providers (e.g. DeepSeek R1, GLM, Kimi) causes 400 Bad Request.
                    if (apiModelName != null && apiModelName.startsWith("Qwen/Qwen3")) {
                        Map<String, Object> extra = new LinkedHashMap<>();
                        extra.put("enable_thinking", enableThinking);
                        optsBuilder.extraBody(extra);
                    }
                    OpenAiChatOptions streamOptions = optsBuilder.build();

                    chatModel.stream(new Prompt(conversationMessages, streamOptions))
                            .doOnNext(chatResp -> {
                                if (chatResp.getResult() == null || chatResp.getResult().getOutput() == null) {
                                    return;
                                }
                                var output = chatResp.getResult().getOutput();
                                // Emit reasoning (thinking) delta if present — but only when the
                                // caller actually wants it. Some models ignore enable_thinking=false
                                // and still stream reasoning, which would leak into plain-text clients
                                // (e.g. the translator panel).
                                if (enableThinking) {
                                    Object reasoning = output.getMetadata() != null
                                            ? output.getMetadata().get("reasoningContent")
                                            : null;
                                    if (reasoning instanceof String rs && !rs.isEmpty()) {
                                        sink.next(buildReasoningEvent(modelId, rs));
                                    }
                                }
                                // Emit content delta
                                String delta = output.getText();
                                if (delta != null && !delta.isEmpty()) {
                                    fullContent.append(delta);
                                    sink.next(buildSseEvent(modelId, delta, false, null));
                                }
                            })
                            .doOnError(e -> {
                                sink.next(buildSseEvent(modelId, "", true,
                                        "Model call failed: " + e.getMessage()));
                                sink.complete();
                            })
                            .blockLast(); // Block THIS thread (not main) until stream completes

                    // 5. Persist AI response (skipped for ephemeral tool requests)
                    if (!ephemeral) {
                        Message aiMsg = new Message();
                        aiMsg.setUserId(userId);
                        aiMsg.setConversationId(conversationId);
                        aiMsg.setModelId(modelId);
                        aiMsg.setRole(Message.Role.AI);
                        aiMsg.setContent(fullContent.toString());
                        aiMsg.setTimestamp(LocalDateTime.now());
                        messageRepository.insert(aiMsg);
                    }

                    sink.next(buildSseEvent(modelId, "", true, null));
                    sink.complete();
                } catch (Exception e) {
                    sink.next(buildSseEvent(modelId, "", true, "Failed: " + e.getMessage()));
                    sink.complete();
                }
            });
        });
    }

    private ServerSentEvent<String> buildSseEvent(String modelId, String content, boolean done, String error) {
        return buildSseEvent(modelId, content, done, error, false);
    }

    private ServerSentEvent<String> buildSseEvent(String modelId, String content, boolean done,
                                                   String error, boolean searching) {
        try {
            Map<String, Object> chunk = new LinkedHashMap<>();
            chunk.put("modelId", modelId);
            chunk.put("content", content);
            chunk.put("done", done);
            if (error != null) chunk.put("error", error);
            if (searching) chunk.put("searching", true);
            return ServerSentEvent.<String>builder()
                    .data(objectMapper.writeValueAsString(chunk))
                    .build();
        } catch (Exception e) {
            return ServerSentEvent.<String>builder()
                    .data("{\"modelId\":\"" + modelId + "\",\"error\":\"serialization error\",\"done\":true}")
                    .build();
        }
    }

    /**
     * Resolve frontend-facing image URLs (e.g. "/api/files/abc.jpg") into Spring AI Media objects
     * by loading bytes from the uploaded_files table. Required so vision models receive pixel
     * data directly (SiliconFlow's servers can't reach our internal /api/files/ URL).
     */
    private List<Media> loadImageMedia(List<String> imageUrls) {
        if (imageUrls == null || imageUrls.isEmpty()) return List.of();
        List<Media> mediaList = new ArrayList<>();
        final String prefix = "/api/files/";
        for (String url : imageUrls) {
            if (url == null || url.isBlank()) continue;
            int idx = url.indexOf(prefix);
            if (idx < 0) continue;
            String id = url.substring(idx + prefix.length());
            try {
                var record = uploadedFileRepository.selectById(id);
                if (record == null || record.getData() == null) continue;
                String mime = record.getContentType();
                if (mime == null || mime.isBlank()) mime = "image/jpeg";
                mediaList.add(Media.builder()
                        .mimeType(MimeTypeUtils.parseMimeType(mime))
                        .data(new ByteArrayResource(record.getData()))
                        .build());
            } catch (Exception e) {
                System.err.println("[loadImageMedia] failed for id=" + id + ": " + e.getMessage());
            }
        }
        return mediaList;
    }

    private ServerSentEvent<String> buildReasoningEvent(String modelId, String content) {
        try {
            Map<String, Object> chunk = new LinkedHashMap<>();
            chunk.put("type", "reasoning");
            chunk.put("modelId", modelId);
            chunk.put("content", content);
            return ServerSentEvent.<String>builder()
                    .data(objectMapper.writeValueAsString(chunk))
                    .build();
        } catch (Exception e) {
            return ServerSentEvent.<String>builder()
                    .data("{\"type\":\"reasoning\",\"modelId\":\"" + modelId + "\",\"content\":\"\"}")
                    .build();
        }
    }

    private ServerSentEvent<String> buildConversationIdEvent(String conversationId) {
        try {
            Map<String, Object> meta = new LinkedHashMap<>();
            meta.put("type", "conversation");
            meta.put("conversationId", conversationId);
            return ServerSentEvent.<String>builder()
                    .data(objectMapper.writeValueAsString(meta))
                    .build();
        } catch (Exception e) {
            return ServerSentEvent.<String>builder()
                    .data("{\"type\":\"conversation\",\"conversationId\":\"" + conversationId + "\"}")
                    .build();
        }
    }

    private String resolveModelName(String modelId) {
        String cached = modelNameCache.get(modelId);
        if (cached != null) return cached;

        Model model = modelRepository.selectById(modelId);
        if (model == null) {
            throw new IllegalArgumentException("Unknown model: " + modelId);
        }
        if (!Boolean.TRUE.equals(model.getEnabled())) {
            throw new IllegalArgumentException("Model is disabled: " + modelId);
        }
        String apiName = model.getModelName() != null ? model.getModelName() : modelId;
        modelNameCache.put(modelId, apiName);
        return apiName;
    }

    /** Clear model name cache (call after model config changes). */
    public void clearModelNameCache() {
        modelNameCache.clear();
        modelVisionCache.clear();
    }

    /** Whether the given modelId is marked as supporting image input. */
    private boolean modelSupportsVision(String modelId) {
        Boolean cached = modelVisionCache.get(modelId);
        if (cached != null) return cached;
        Model model = modelRepository.selectById(modelId);
        boolean v = model != null && Boolean.TRUE.equals(model.getSupportsVision());
        modelVisionCache.put(modelId, v);
        return v;
    }

    // ======================== Smart Title Generation ========================

    private static final String TITLE_MODEL = "Qwen/Qwen3-8B";
    private static final String TITLE_PROMPT =
            "根据以下用户消息，生成一个简洁的中文对话标题（不超过15个字，不要引号，不要标点，直接输出标题）：\n\n";

    private Flux<ServerSentEvent<String>> generateSmartTitle(String conversationId, String userMessage) {
        return Flux.<ServerSentEvent<String>>create(sink -> {
            modelExecutor.submit(() -> {
                try {
                    OpenAiChatOptions opts = OpenAiChatOptions.builder().model(TITLE_MODEL).build();
                    List<org.springframework.ai.chat.messages.Message> msgs = List.of(
                            new SystemMessage("你是一个标题生成助手。只输出标题，不要任何其他内容。/no_think"),
                            new UserMessage(TITLE_PROMPT + userMessage));
                    ChatResponse resp = chatModel.call(new Prompt(msgs, opts));
                    String title = resp.getResult().getOutput().getText();
                    if (title != null) {
                        title = title.replaceAll("[\"'\\u201c\\u201d\\u2018\\u2019\\n]", "").trim();
                        if (title.length() > 30) title = title.substring(0, 30);
                        if (!title.isEmpty()) {
                            Conversation conv = conversationRepository.selectById(conversationId);
                            if (conv != null) {
                                conv.setTitle(title);
                                conversationRepository.updateById(conv);
                            }
                            sink.next(buildTitleEvent(conversationId, title));
                        }
                    }
                } catch (Exception e) {
                    // Title generation is best-effort; silently ignore failures
                }
                sink.complete();
            });
        });
    }

    private ServerSentEvent<String> buildTitleEvent(String conversationId, String title) {
        try {
            Map<String, Object> data = new LinkedHashMap<>();
            data.put("type", "title");
            data.put("conversationId", conversationId);
            data.put("title", title);
            return ServerSentEvent.<String>builder()
                    .data(objectMapper.writeValueAsString(data))
                    .build();
        } catch (Exception e) {
            return ServerSentEvent.<String>builder()
                    .data("{\"type\":\"title\",\"conversationId\":\"" + conversationId + "\",\"title\":\"新对话\"}")
                    .build();
        }
    }

    // ======================== AI Enhance ========================

    private static final String ENHANCE_MODEL = "Qwen/Qwen3-8B";
    private static final String ENHANCE_SYSTEM_PROMPT =
            "你是一个提示词优化专家。用户会给你一段提示词，请优化它使其更清晰、更具体、更容易让AI理解。" +
            "直接输出优化后的提示词，不要解释。保持原文语言（中文输入就输出中文，英文输入就输出英文）。/no_think";

    public String enhancePrompt(String prompt) {
        OpenAiChatOptions opts = OpenAiChatOptions.builder().model(ENHANCE_MODEL).build();
        List<org.springframework.ai.chat.messages.Message> msgs = List.of(
                new SystemMessage(ENHANCE_SYSTEM_PROMPT),
                new UserMessage(prompt));
        ChatResponse resp = chatModel.call(new Prompt(msgs, opts));
        String enhanced = resp.getResult().getOutput().getText();
        return enhanced != null ? enhanced.trim() : prompt;
    }

    public ChatHistoryResponse history(ChatHistoryRequest request) {
        if (request == null) throw new IllegalArgumentException("request is required");
        if (request.getUserId() == null || request.getUserId().isBlank()) {
            throw new IllegalArgumentException("userId is required");
        }
        if (request.getModelId() == null || request.getModelId().isBlank()) {
            throw new IllegalArgumentException("modelId is required");
        }

        int limit = request.getLimit() <= 0 ? 50 : Math.min(request.getLimit(), 200);

        LambdaQueryWrapper<Message> query = new LambdaQueryWrapper<Message>()
                .eq(Message::getUserId, request.getUserId().trim())
                .eq(Message::getModelId, request.getModelId().trim());
        // Scope to conversation if provided
        if (request.getConversationId() != null && !request.getConversationId().isBlank()) {
            query.eq(Message::getConversationId, request.getConversationId().trim());
        }
        query.orderByDesc(Message::getTimestamp).last("limit " + limit);

        List<Message> rows = messageRepository.selectList(query);

        // Reverse to chronological order for the client
        Collections.reverse(rows);

        ChatHistoryResponse resp = new ChatHistoryResponse();
        resp.setMessages(
                rows.stream()
                        .filter(Objects::nonNull)
                        .map(m -> {
                            ChatHistoryResponse.MessageHistory mh = new ChatHistoryResponse.MessageHistory();
                            mh.setModelId(m.getModelId());
                            mh.setRole(m.getRole() == Message.Role.USER ? "user" : "assistant");
                            mh.setContent(m.getContent());
                            mh.setTimestamp(m.getTimestamp());
                            if (m.getImageUrls() != null && !m.getImageUrls().isBlank()) {
                                try {
                                    mh.setImageUrls(objectMapper.readValue(
                                            m.getImageUrls(),
                                            new com.fasterxml.jackson.core.type.TypeReference<List<String>>() {}));
                                } catch (Exception ignore) { /* skip malformed */ }
                            }
                            return mh;
                        })
                        .toList()
        );
        return resp;
    }
}
