package com.agentbox.platform.services;

import com.agentbox.platform.dto.ChatHistoryRequest;
import com.agentbox.platform.dto.ChatHistoryResponse;
import com.agentbox.platform.dto.MessageRequest;
import com.agentbox.platform.dto.MessageResponse;
import com.agentbox.platform.models.Message;
import com.agentbox.platform.models.Model;
import com.agentbox.platform.repositories.MessageRepository;
import com.agentbox.platform.repositories.ModelRepository;
import com.alibaba.cloud.ai.dashscope.api.DashScopeApi;
import com.alibaba.cloud.ai.dashscope.chat.DashScopeChatModel;
import com.alibaba.cloud.ai.dashscope.chat.DashScopeChatOptions;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.annotation.PreDestroy;
import org.springframework.ai.chat.messages.AssistantMessage;
import org.springframework.ai.chat.messages.UserMessage;
import org.springframework.ai.chat.model.ChatModel;
import org.springframework.ai.chat.model.ChatResponse;
import org.springframework.ai.chat.prompt.Prompt;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.codec.ServerSentEvent;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Flux;

import java.time.LocalDateTime;
import java.util.*;
import java.util.concurrent.*;

@Service
public class ChatService {

    private static final int MAX_HISTORY_MESSAGES = 20;

    @Autowired
    private ChatModel chatModel;

    @Value("${spring.ai.dashscope.api-key}")
    private String dashScopeApiKey;

    @Autowired
    private MessageRepository messageRepository;

    @Autowired
    private ModelRepository modelRepository;

    @Autowired
    private ObjectMapper objectMapper;

    private final ExecutorService modelExecutor = Executors.newFixedThreadPool(
            Math.max(8, Runtime.getRuntime().availableProcessors()));

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
            DashScopeChatOptions options = DashScopeChatOptions.builder().model(apiModelName).build();
            ChatModel freshModel = createFreshChatModel();
            ChatResponse chatResponse = freshModel.call(new Prompt(conversationMessages, options));
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

        List<Flux<ServerSentEvent<String>>> modelFluxes = validModelIds.stream()
                .map(modelId -> streamSingleModel(userId, modelId, trimmedMessage))
                .toList();

        return Flux.merge(modelFluxes);
    }

    private Flux<ServerSentEvent<String>> streamSingleModel(String userId, String modelId, String userMessage) {
        return Flux.<ServerSentEvent<String>>create(sink -> {
            modelExecutor.submit(() -> {
                try {
                    // 1. Fetch history
                    List<Message> history = messageRepository.selectList(
                            new LambdaQueryWrapper<Message>()
                                    .eq(Message::getUserId, userId)
                                    .eq(Message::getModelId, modelId)
                                    .orderByDesc(Message::getTimestamp)
                                    .last("limit " + MAX_HISTORY_MESSAGES)
                    );
                    Collections.reverse(history);

                    // 2. Build conversation
                    List<org.springframework.ai.chat.messages.Message> conversationMessages = new ArrayList<>();
                    for (Message msg : history) {
                        if (msg.getRole() == Message.Role.USER) {
                            conversationMessages.add(new UserMessage(msg.getContent()));
                        } else {
                            conversationMessages.add(new AssistantMessage(msg.getContent()));
                        }
                    }
                    conversationMessages.add(new UserMessage(userMessage));

                    // 3. Save user message
                    Message userMsg = new Message();
                    userMsg.setUserId(userId);
                    userMsg.setModelId(modelId);
                    userMsg.setRole(Message.Role.USER);
                    userMsg.setContent(userMessage);
                    userMsg.setTimestamp(LocalDateTime.now());
                    messageRepository.insert(userMsg);

                    // 4. Stream from model — each model runs on its own thread for true parallelism
                    StringBuilder fullContent = new StringBuilder();
                    String apiModelName = resolveModelName(modelId);
                    DashScopeChatOptions streamOptions = DashScopeChatOptions.builder()
                            .model(apiModelName).build();

                    ChatModel freshModel = createFreshChatModel();
                    freshModel.stream(new Prompt(conversationMessages, streamOptions))
                            .doOnNext(chatResp -> {
                                String delta = (chatResp.getResult() != null
                                        && chatResp.getResult().getOutput() != null)
                                        ? chatResp.getResult().getOutput().getText()
                                        : "";
                                if (delta != null) {
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

                    // 5. Persist AI response
                    Message aiMsg = new Message();
                    aiMsg.setUserId(userId);
                    aiMsg.setModelId(modelId);
                    aiMsg.setRole(Message.Role.AI);
                    aiMsg.setContent(fullContent.toString());
                    aiMsg.setTimestamp(LocalDateTime.now());
                    messageRepository.insert(aiMsg);

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
        try {
            Map<String, Object> chunk = new LinkedHashMap<>();
            chunk.put("modelId", modelId);
            chunk.put("content", content);
            chunk.put("done", done);
            if (error != null) chunk.put("error", error);
            return ServerSentEvent.<String>builder()
                    .data(objectMapper.writeValueAsString(chunk))
                    .build();
        } catch (Exception e) {
            return ServerSentEvent.<String>builder()
                    .data("{\"modelId\":\"" + modelId + "\",\"error\":\"serialization error\",\"done\":true}")
                    .build();
        }
    }

    private ChatModel createFreshChatModel() {
        DashScopeApi api = DashScopeApi.builder().apiKey(dashScopeApiKey).build();
        return new DashScopeChatModel.Builder((DashScopeChatModel) chatModel).dashScopeApi(api).build();
    }

    private String resolveModelName(String modelId) {
        Model model = modelRepository.selectById(modelId);
        if (model == null) {
            throw new IllegalArgumentException("Unknown model: " + modelId);
        }
        if (!Boolean.TRUE.equals(model.getEnabled())) {
            throw new IllegalArgumentException("Model is disabled: " + modelId);
        }
        return model.getModelName() != null ? model.getModelName() : modelId;
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

        List<Message> rows = messageRepository.selectList(
                new LambdaQueryWrapper<Message>()
                        .eq(Message::getUserId, request.getUserId().trim())
                        .eq(Message::getModelId, request.getModelId().trim())
                        .orderByDesc(Message::getTimestamp)
                        .last("limit " + limit)
        );

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
                            return mh;
                        })
                        .toList()
        );
        return resp;
    }
}
