"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ChatPanel } from "@/components/ChatPanel";
import { ChatInput } from "@/components/ChatInput";
import { WelcomeDialog } from "@/components/WelcomeDialog";
import { Sidebar, type ConversationInfo } from "@/components/SideBar";
import { TranslatorPanel } from "@/components/TranslatorPanel";
import { WebSummarizerPanel } from "@/components/WebSummarizerPanel";
import { ImageGeneratorPanel } from "@/components/ImageGeneratorPanel";
import { ModelLeaderboard } from "@/components/ModelLeaderboard";
import { useAuth } from "@/lib/auth";
import { apiFetch } from "@/lib/api";

interface ModelInfo {
  id: string;
  name: string;
  icon: string;
  supportsVision?: boolean;
}

interface Message {
  role: "user" | "assistant";
  content: string;
  imageUrls?: string[];
  reasoning?: string;
  reasoningStart?: number;
  reasoningEnd?: number;
  isError?: boolean;
}

export default function Home() {
  const router = useRouter();
  const { token, initializing } = useAuth();

  // Redirect unauthenticated visitors to /login once auth state is resolved.
  useEffect(() => {
    if (!initializing && !token) {
      router.replace("/login");
    }
  }, [initializing, token, router]);

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [selectedLayout, setSelectedLayout] = useState(1);
  const [selectedModels, setSelectedModels] = useState<string[]>([]);
  const [showWelcome, setShowWelcome] = useState(false);
  const [messages, setMessages] = useState<Record<string, Message[]>>({});
  const [activeModelId, setActiveModelId] = useState<string | null>(null);
  const [allModels, setAllModels] = useState<ModelInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [panelModelIds, setPanelModelIds] = useState<string[]>([]);
  const [streamingModels, setStreamingModels] = useState<Set<string>>(new Set());
  const [activeTool, setActiveTool] = useState<string | null>(null);
  const [conversations, setConversations] = useState<ConversationInfo[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [votedModelId, setVotedModelId] = useState<string | null>(null);
  // View mode: 'all-in-one' = multi-panel grid; 'single' = one standalone chat for singleModelId.
  const [viewMode, setViewMode] = useState<"all-in-one" | "single">("all-in-one");
  const [singleModelId, setSingleModelId] = useState<string | null>(null);

  // Tracks which modelIds have already had history fetched (avoid duplicate loads).
  const loadedHistoryRef = useRef<Set<string>>(new Set());

  // Fetch persisted history for a model and merge into state (only if not loaded yet).
  const loadHistory = useCallback(async (mid: string) => {
    if (!mid) return;
    if (loadedHistoryRef.current.has(mid)) return;
    loadedHistoryRef.current.add(mid);

    try {
      const res = await apiFetch("/api/chat/history", {
        method: "POST",
        body: JSON.stringify({ modelId: mid, limit: 50, conversationId: activeConversationId || undefined }),
      });
      if (!res.ok) throw new Error(`history request failed: ${res.status}`);
      const data = (await res.json()) as {
        messages?: Array<{ role: "user" | "assistant"; content: string; imageUrls?: string[] }>;
      };
      const loaded: Message[] = (data.messages || []).map((m) => ({
        role: m.role,
        content: m.content,
        imageUrls: m.imageUrls,
      }));

      // Only populate if the user hasn't already started chatting in this tab.
      setMessages((prev) => {
        if (prev[mid] && prev[mid].length > 0) return prev;
        return { ...prev, [mid]: loaded };
      });
    } catch (e) {
      console.error("Failed to load history for", mid, e);
      // Allow retry on next trigger.
      loadedHistoryRef.current.delete(mid);
    }
  }, [activeConversationId]);

  useEffect(() => {
    let cancelled = false;

    async function loadModels() {
      try {
        // Always fetch fresh from the same endpoint as Sidebar so icon URLs match.
        const res = await apiFetch("/api/models/getmodels");
        const data = (await res.json()) as ModelInfo[];
        if (!cancelled) {
          setAllModels(data);
          setSelectedModels((prev) =>
            prev.length === 0 && data.length > 0 ? [data[0].id] : prev
          );
          setLoading(false);
        }
      } catch (error) {
        console.error("Failed to load models:", error);
        if (!cancelled) setLoading(false);
      }
    }

    loadModels();
    return () => {
      cancelled = true;
    };
  }, []);

  // Fetch user's conversations
  const fetchConversations = useCallback(async () => {
    try {
      const res = await apiFetch("/api/conversations");
      if (!res.ok) return;
      const data = (await res.json()) as ConversationInfo[];
      setConversations(data);
    } catch (e) {
      console.error("Failed to load conversations:", e);
    }
  }, []);

  useEffect(() => {
    if (!token) return;
    fetchConversations();
  }, [token, fetchConversations]);

  // Conversation management handlers
  const handleConversationCreate = async () => {
    try {
      const res = await apiFetch("/api/conversations", {
        method: "POST",
        body: JSON.stringify({ title: "新对话" }),
      });
      if (!res.ok) return;
      const conv = (await res.json()) as ConversationInfo;
      setConversations((prev) => [conv, ...prev]);
      handleConversationSelect(conv.id);
    } catch (e) {
      console.error("Failed to create conversation:", e);
    }
  };

  const handleConversationDelete = async (id: string) => {
    try {
      await apiFetch(`/api/conversations/${id}`, { method: "DELETE" });
      setConversations((prev) => prev.filter((c) => c.id !== id));
      if (activeConversationId === id) {
        setActiveConversationId(null);
        setMessages({});
        loadedHistoryRef.current.clear();
      }
    } catch (e) {
      console.error("Failed to delete conversation:", e);
    }
  };

  const handleConversationRename = async (id: string, title: string) => {
    try {
      await apiFetch(`/api/conversations/${id}/title`, {
        method: "PUT",
        body: JSON.stringify({ title }),
      });
      setConversations((prev) =>
        prev.map((c) => (c.id === id ? { ...c, title } : c))
      );
    } catch (e) {
      console.error("Failed to rename conversation:", e);
    }
  };

  const handleConversationSelect = (id: string | null) => {
    if (id === activeConversationId) return;
    setActiveConversationId(id);
    setMessages({});
    loadedHistoryRef.current.clear();
    // Dismiss any active tool so chat view is shown
    setActiveTool(null);
  };

  // Click a model in the sidebar → enter single-model view for that model.
  // Messages are keyed by modelId at the top level, so chat history is shared
  // between all-in-one and single views for the same model.
  const handleModelToggle = (modelId: string) => {
    setViewMode("single");
    setSingleModelId(modelId);
    setActiveModelId(modelId);
    loadHistory(modelId);
  };

  // Click a layout button → enter/stay in all-in-one view and update layout.
  const handleLayoutChange = (layout: number) => {
    setViewMode("all-in-one");
    setSelectedLayout(layout);
  };

  // Stream from a single model via its own dedicated HTTP request.
  const streamOneModel = async (
    mid: string,
    message: string,
    options: { webSearch: boolean; imageGen: boolean; enableThinking: boolean },
    conversationId?: string | null,
    imageUrls?: string[],
  ) => {
    setStreamingModels((prev) => new Set(prev).add(mid));
    try {
      const res = await apiFetch("/api/chat/stream", {
        method: "POST",
        body: JSON.stringify({
          message,
          modelIds: [mid],
          options,
          conversationId: conversationId || undefined,
          imageUrls: imageUrls && imageUrls.length > 0 ? imageUrls : undefined,
        }),
      });

      if (!res.ok) throw new Error(`chat request failed: ${res.status}`);
      const reader = res.body?.getReader();
      if (!reader) throw new Error("No response body");

      const decoder = new TextDecoder();
      let sseBuffer = "";
      let accumulated = "";
      let streamStarted = false;
      let streamDone = false;
      let searchingPhase = false;

      while (true) {
        let readResult: ReadableStreamReadResult<Uint8Array>;
        try {
          readResult = await reader.read();
        } catch {
          // Connection closed after content already delivered — not a real error.
          if (streamStarted) break;
          throw new Error("network error");
        }
        if (readResult.done) break;

        sseBuffer += decoder.decode(readResult.value, { stream: true });
        const parts = sseBuffer.split("\n\n");
        sseBuffer = parts.pop() || "";

        for (const part of parts) {
          const dataLine = part.split("\n").find((l) => l.startsWith("data:"));
          if (!dataLine) continue;

          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          let parsed: any;
          try {
            parsed = JSON.parse(dataLine.slice(5));
          } catch {
            continue;
          }

          // Handle conversation meta event (auto-created conversationId)
          if (parsed.type === "conversation" && parsed.conversationId) {
            setActiveConversationId((prev) => prev || parsed.conversationId);
            fetchConversations();
            continue;
          }

          // Handle smart title event
          if (parsed.type === "title" && parsed.conversationId && parsed.title) {
            setConversations((prev) =>
              prev.map((c) =>
                c.id === parsed.conversationId ? { ...c, title: parsed.title } : c
              )
            );
            continue;
          }

          // Handle reasoning (thinking) stream
          if (parsed.type === "reasoning" && parsed.content) {
            setMessages((prev) => {
              const msgs = [...(prev[mid] || [])];
              const lastIdx = msgs.length - 1;
              const now = Date.now();
              if (lastIdx >= 0 && msgs[lastIdx].role === "assistant" && !msgs[lastIdx].isError) {
                msgs[lastIdx] = {
                  ...msgs[lastIdx],
                  reasoning: (msgs[lastIdx].reasoning || "") + parsed.content,
                  reasoningStart: msgs[lastIdx].reasoningStart || now,
                };
              } else {
                msgs.push({
                  role: "assistant" as const,
                  content: "",
                  reasoning: parsed.content,
                  reasoningStart: now,
                });
              }
              return { ...prev, [mid]: msgs };
            });
            continue;
          }

          const chunk = parsed as { modelId: string; content: string; done: boolean; error?: string; searching?: boolean };

          if (chunk.error) {
            setMessages((prev) => ({
              ...prev,
              [mid]: [
                ...(prev[mid] || []),
                { role: "assistant" as const, content: chunk.error!, isError: true },
              ],
            }));
            continue;
          }

          if (chunk.done) {
            streamDone = true;
            continue;
          }

          // Handle web search indicator
          if (chunk.searching) {
            if (!searchingPhase) {
              searchingPhase = true;
              setMessages((prev) => ({
                ...prev,
                [mid]: [
                  ...(prev[mid] || []),
                  { role: "assistant" as const, content: "\uD83D\uDD0D 正在搜索网络..." },
                ],
              }));
            }
            continue;
          }

          accumulated += chunk.content;

          if (!streamStarted) {
            streamStarted = true;
            const now = Date.now();
            setMessages((prev) => {
              const msgs = [...(prev[mid] || [])];
              const lastIdx = msgs.length - 1;
              const last = lastIdx >= 0 ? msgs[lastIdx] : null;
              // If last message is a placeholder (searching or reasoning-only), reuse it
              if (last && last.role === "assistant" && !last.isError && (searchingPhase || last.reasoning)) {
                msgs[lastIdx] = {
                  ...last,
                  content: accumulated,
                  reasoningEnd: last.reasoning ? now : last.reasoningEnd,
                };
              } else {
                msgs.push({ role: "assistant" as const, content: accumulated });
              }
              return { ...prev, [mid]: msgs };
            });
          } else {
            setMessages((prev) => {
              const msgs = [...(prev[mid] || [])];
              const lastIdx = msgs.length - 1;
              if (lastIdx >= 0 && msgs[lastIdx].role === "assistant" && !msgs[lastIdx].isError) {
                msgs[lastIdx] = { ...msgs[lastIdx], content: accumulated };
              }
              return { ...prev, [mid]: msgs };
            });
          }
        }
        if (streamDone) break;
      }
    } catch (e) {
      setMessages((prev) => ({
        ...prev,
        [mid]: [
          ...(prev[mid] || []),
          {
            role: "assistant" as const,
            content: `请求失败: ${e instanceof Error ? e.message : String(e)}`,
            isError: true,
          },
        ],
      }));
    } finally {
      setStreamingModels((prev) => {
        const next = new Set(prev);
        next.delete(mid);
        return next;
      });
    }
  };

  // Panel model ids drive what each visible panel shows in all-in-one mode.
  const visiblePanelModelIds = panelModelIds.slice(0, selectedLayout);
  const activeModels = visiblePanelModelIds
    .map((id) => allModels.find((m) => m.id === id))
    .filter(Boolean) as ModelInfo[];

  const singleModelView =
    viewMode === "single" && singleModelId
      ? allModels.find((m) => m.id === singleModelId) ?? null
      : null;

  // Clear all messages for a given model.
  // NOTE: this only clears local state; server-side history is NOT deleted.
  // We drop the loaded flag so leaving and returning to this model re-pulls
  // the persisted history.
  // Vote for the best model response
  const handleVote = async (modelId: string) => {
    if (votedModelId) return;
    setVotedModelId(modelId);

    // Find last user message for context
    const msgs = messages[modelId] || [];
    let lastUserMsg = "";
    for (let i = msgs.length - 1; i >= 0; i--) {
      if (msgs[i].role === "user") { lastUserMsg = msgs[i].content; break; }
    }

    try {
      await apiFetch("/api/votes", {
        method: "POST",
        body: JSON.stringify({
          modelId,
          conversationId: activeConversationId || undefined,
          userMessage: lastUserMsg || undefined,
        }),
      });
    } catch (e) {
      console.error("Failed to submit vote:", e);
    }
  };

  const handleClearChat = (mid: string) => {
    setMessages((prev) => {
      const next = { ...prev };
      delete next[mid];
      return next;
    });
    loadedHistoryRef.current.delete(mid);
  };

  // Re-run the last user message for a given model:
  // 1) strip trailing assistant replies back to the last user message
  // 2) stream a fresh response
  const handleRegenerate = async (mid: string) => {
    const existing = messages[mid] || [];
    // Find last user message index.
    let lastUserIdx = -1;
    for (let i = existing.length - 1; i >= 0; i--) {
      if (existing[i].role === "user") {
        lastUserIdx = i;
        break;
      }
    }
    if (lastUserIdx === -1) return;

    const lastUserMessage = existing[lastUserIdx].content;
    // Keep messages up to and including the last user message; drop everything after.
    setMessages((prev) => ({
      ...prev,
      [mid]: (prev[mid] || []).slice(0, lastUserIdx + 1),
    }));

    await streamOneModel(mid, lastUserMessage, { webSearch: false, imageGen: false, enableThinking: false }, activeConversationId);
  };

  const handleSendMessage = async (params: {
    message: string;
    modelIds: string[];
    options: { webSearch: boolean; imageGen: boolean; enableThinking: boolean };
    imageUrls?: string[];
  }) => {
    const { message, modelIds, options, imageUrls } = params;

    // Pick targets based on current view mode.
    const fallbackIds =
      viewMode === "single" && singleModelId
        ? [singleModelId]
        : activeModels.map((m) => m.id);
    const effectiveModelIds =
      modelIds && modelIds.length > 0 ? modelIds : fallbackIds;

    if (effectiveModelIds.length === 0) return;

    // Reset vote for new turn
    setVotedModelId(null);

    // 1. Add user message to ALL target panels immediately.
    setMessages((prev) => {
      const next = { ...prev };
      for (const mid of effectiveModelIds) {
        next[mid] = [
          ...(next[mid] || []),
          { role: "user" as const, content: message, imageUrls },
        ];
      }
      return next;
    });

    // 2. Resolve the conversationId BEFORE firing parallel requests. Otherwise each
    //    parallel /api/chat/stream call sees no conversationId and the backend creates
    //    a separate conversation for each model — leaving N-1 orphans in the sidebar.
    let convId = activeConversationId;
    if (!convId) {
      try {
        const truncated = message.length > 30 ? message.slice(0, 30) + "..." : message;
        const createRes = await apiFetch("/api/conversations", {
          method: "POST",
          body: JSON.stringify({ title: truncated }),
        });
        if (createRes.ok) {
          const conv = await createRes.json();
          convId = conv.id;
          setActiveConversationId(conv.id);
          fetchConversations();
        }
      } catch (e) {
        console.error("Failed to pre-create conversation:", e);
      }
    }

    // 3. Fire N independent HTTP requests in parallel (non-blocking so the
    //    input is immediately re-enabled for the next turn).
    effectiveModelIds.forEach((mid) => streamOneModel(mid, message, options, convId, imageUrls));
  };

  useEffect(() => {
    // When layout increases, auto-fill selected models so UI can show N panels.
    if (loading) return;
    if (allModels.length === 0) return;

    setSelectedModels((prev) => {
      if (prev.length >= selectedLayout) return prev;
      const needed = selectedLayout - prev.length;
      const candidates = allModels
        .map((m) => m.id)
        .filter((id) => !prev.includes(id));

      if (candidates.length === 0) return prev;
      return [...prev, ...candidates.slice(0, needed)];
    });
  }, [selectedLayout, allModels, loading]);

  useEffect(() => {
    // Keep per-panel model ids aligned with available selected models.
    if (loading) return;
    if (allModels.length === 0) return;

    setPanelModelIds((prev) => {
      const base =
        prev.length > 0
          ? prev
          : selectedModels.length > 0
            ? selectedModels
            : allModels.map((m) => m.id);

      const next: string[] = [];
      const used = new Set<string>();
      for (const id of base) {
        if (!id) continue;
        if (used.has(id)) continue;
        used.add(id);
        next.push(id);
      }
      if (next.length < selectedLayout) {
        for (const m of allModels) {
          if (next.length >= selectedLayout) break;
          if (used.has(m.id)) continue;
          used.add(m.id);
          next.push(m.id);
        }
      }
      return next;
    });
  }, [selectedLayout, selectedModels, allModels, loading]);

  useEffect(() => {
    if (viewMode !== "all-in-one") return;
    if (activeModels.length === 0) {
      setActiveModelId(null);
      return;
    }
    setActiveModelId((prev) => {
      if (prev && activeModels.some((m) => m.id === prev)) return prev;
      return activeModels[0].id;
    });
  }, [viewMode, selectedLayout, selectedModels, allModels.length]);

  // Auto-load persisted history whenever a new model becomes visible in any panel.
  useEffect(() => {
    if (loading) return;
    const targets =
      viewMode === "single" && singleModelId
        ? [singleModelId]
        : panelModelIds;
    for (const mid of targets) {
      if (mid) loadHistory(mid);
    }
  }, [viewMode, singleModelId, panelModelIds, loading, loadHistory]);

  const handlePanelModelChange = (panelIndex: number, modelId: string) => {
    setPanelModelIds((prev) => {
      const next = prev.length > 0 ? [...prev] : [];
      while (next.length < selectedLayout) next.push("");
      next[panelIndex] = modelId;
      return next;
    });

    setSelectedModels((prev) => (prev.includes(modelId) ? prev : [...prev, modelId]));
    setActiveModelId(modelId);
    loadHistory(modelId);
  };

  const getGridCols = () => {
    if (selectedLayout === 1) return "grid-cols-1";
    if (selectedLayout === 2) return "grid-cols-2";
    if (selectedLayout === 3) return "grid-cols-3";
    if (selectedLayout === 4) return "grid-cols-2 grid-rows-2";
    return "grid-cols-3 grid-rows-2";
  };

  // Gate the whole app behind auth. Returning early before hooks above would
  // violate React rules, so we render a lightweight placeholder here instead.
  if (initializing || !token) {
    return (
      <div className="h-screen flex items-center justify-center text-neutral-500">
        <p className="text-sm">加载中…</p>
      </div>
    );
  }

  return (
    <div className="h-screen flex overflow-hidden">
      {/* Sidebar */}
      <Sidebar
        // In single mode, no layout is highlighted (pass 0 so none match).
        selectedLayout={viewMode === "all-in-one" && !activeTool ? selectedLayout : 0}
        onLayoutChange={(l) => { setActiveTool(null); handleLayoutChange(l); }}
        selectedModels={
          viewMode === "single" && singleModelId
            ? [singleModelId]
            : activeModels.map((m) => m.id)
        }
        onModelToggle={(id) => { setActiveTool(null); handleModelToggle(id); }}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        activeTool={activeTool}
        onToolSelect={setActiveTool}
        conversations={conversations}
        activeConversationId={activeConversationId}
        onConversationSelect={handleConversationSelect}
        onConversationCreate={handleConversationCreate}
        onConversationDelete={handleConversationDelete}
        onConversationRename={handleConversationRename}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 main-gradient">
        {/* Tool views */}
        {activeTool === "translator" ? (
          <div className="flex-1 min-h-0 overflow-y-auto">
            <TranslatorPanel />
          </div>
        ) : activeTool === "summarizer" ? (
          <div className="flex-1 min-h-0 overflow-y-auto">
            <WebSummarizerPanel />
          </div>
        ) : activeTool === "image-gen" ? (
          <div className="flex-1 min-h-0 overflow-y-auto">
            <ImageGeneratorPanel />
          </div>
        ) : activeTool === "leaderboard" ? (
          <div className="flex-1 min-h-0 overflow-y-auto">
            <ModelLeaderboard />
          </div>
        ) : activeTool ? (
          <div className="flex-1 flex items-center justify-center text-neutral-500">
            <p className="text-lg font-medium">即将推出...</p>
          </div>
        ) : viewMode === "single" ? (
          <div className="flex-1 min-h-0 p-4">
            {loading ? (
              <div className="h-full flex items-center justify-center text-neutral-500">
                <p className="text-lg font-medium">加载中...</p>
              </div>
            ) : singleModelView ? (
              <ChatPanel
                modelId={singleModelView.id}
                modelName={singleModelView.name}
                modelIcon={singleModelView.icon}
                messages={messages[singleModelView.id] || []}
                active={true}
                hideModelSwitcher={true}
                isStreaming={streamingModels.has(singleModelView.id)}
                onActivate={() => setActiveModelId(singleModelView.id)}
                onClear={() => handleClearChat(singleModelView.id)}
                onRegenerate={() => handleRegenerate(singleModelView.id)}
                onVote={() => handleVote(singleModelView.id)}
                votedModelId={votedModelId}
                supportsVision={!!singleModelView.supportsVision}
              />
            ) : (
              <div className="h-full flex items-center justify-center text-neutral-500">
                <p className="text-lg font-medium">未选择模型</p>
              </div>
            )}
          </div>
        ) : (
          <div className={`flex-1 min-h-0 p-4 grid gap-4 ${getGridCols()}`}>
            {loading ? (
              <div className="col-span-full flex items-center justify-center">
                <div className="text-center text-neutral-500">
                  <p className="text-lg font-medium mb-2">加载中...</p>
                  <p className="text-sm">正在获取可用模型</p>
                </div>
              </div>
            ) : activeModels.length > 0 ? (
              activeModels.map((model, idx) => (
                <div key={`panel-${idx}`} className="min-h-0 min-w-0">
                  <ChatPanel
                    modelId={model.id}
                    modelName={model.name}
                    modelIcon={model.icon}
                    messages={messages[model.id] || []}
                    active={activeModelId === model.id}
                    isStreaming={streamingModels.has(model.id)}
                    onActivate={() => setActiveModelId(model.id)}
                    onModelChange={(newModelId) =>
                      handlePanelModelChange(idx, newModelId)
                    }
                    onClear={() => handleClearChat(model.id)}
                    onRegenerate={() => handleRegenerate(model.id)}
                    onVote={() => handleVote(model.id)}
                    votedModelId={votedModelId}
                    supportsVision={!!model.supportsVision}
                  />
                </div>
              ))
            ) : (
              <div className="col-span-full flex items-center justify-center">
                <div className="text-center text-neutral-500">
                  <p className="text-lg font-medium mb-2">未选择模型</p>
                  <p className="text-sm">从侧边栏选择模型开始对话</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Input Area — hidden when a tool is active */}
        {!activeTool && <div className="p-4 pt-0">
          <ChatInput
            onSendMessage={handleSendMessage}
            modelIds={
              viewMode === "single" && singleModelId
                ? [singleModelId]
                : activeModels.map((m) => m.id)
            }
          />
        </div>}
      </div>

      {/* Welcome Dialog */}
      <WelcomeDialog open={showWelcome} onOpenChange={setShowWelcome} />
    </div>
  );
}
