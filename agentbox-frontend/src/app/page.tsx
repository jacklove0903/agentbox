"use client";

import { useState, useEffect } from "react";
import { ChatPanel } from "@/components/ChatPanel";
import { ChatInput } from "@/components/ChatInput";
import { WelcomeDialog } from "@/components/WelcomeDialog";
import { Sidebar } from "@/components/SideBar";

interface ModelInfo {
  id: string;
  name: string;
  icon: string;
}

interface Message {
  role: "user" | "assistant";
  content: string;
  isError?: boolean;
}

export default function Home() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [selectedLayout, setSelectedLayout] = useState(1);
  const [selectedModels, setSelectedModels] = useState<string[]>([]);
  const [showWelcome, setShowWelcome] = useState(false);
  const [messages, setMessages] = useState<Record<string, Message[]>>({});
  const [activeModelId, setActiveModelId] = useState<string | null>(null);
  const [allModels, setAllModels] = useState<ModelInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [panelModelIds, setPanelModelIds] = useState<string[]>([]);
  // View mode: 'all-in-one' = multi-panel grid; 'single' = one standalone chat for singleModelId.
  const [viewMode, setViewMode] = useState<"all-in-one" | "single">("all-in-one");
  const [singleModelId, setSingleModelId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadModels() {
      try {
        // Always fetch fresh from the same endpoint as Sidebar so icon URLs match.
        const res = await fetch("http://localhost:8080/api/models/getmodels");
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

  // Click a model in the sidebar → enter single-model view for that model.
  // Messages are keyed by modelId at the top level, so chat history is shared
  // between all-in-one and single views for the same model.
  const handleModelToggle = (modelId: string) => {
    setViewMode("single");
    setSingleModelId(modelId);
    setActiveModelId(modelId);
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
    options: { webSearch: boolean; imageGen: boolean },
  ) => {
    try {
      const res = await fetch("http://localhost:8080/api/chat/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: "demo",
          message,
          modelIds: [mid],
          options,
        }),
      });

      if (!res.ok) throw new Error(`chat request failed: ${res.status}`);
      const reader = res.body?.getReader();
      if (!reader) throw new Error("No response body");

      const decoder = new TextDecoder();
      let sseBuffer = "";
      let accumulated = "";
      let streamStarted = false;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        sseBuffer += decoder.decode(value, { stream: true });
        const parts = sseBuffer.split("\n\n");
        sseBuffer = parts.pop() || "";

        for (const part of parts) {
          const dataLine = part.split("\n").find((l) => l.startsWith("data:"));
          if (!dataLine) continue;

          let chunk: { modelId: string; content: string; done: boolean; error?: string };
          try {
            chunk = JSON.parse(dataLine.slice(5));
          } catch {
            continue;
          }

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

          if (chunk.done) continue;

          accumulated += chunk.content;

          if (!streamStarted) {
            streamStarted = true;
            setMessages((prev) => ({
              ...prev,
              [mid]: [
                ...(prev[mid] || []),
                { role: "assistant" as const, content: accumulated },
              ],
            }));
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

  const handleSendMessage = async (params: {
    message: string;
    modelIds: string[];
    options: { webSearch: boolean; imageGen: boolean };
  }) => {
    const { message, modelIds, options } = params;

    // Pick targets based on current view mode.
    const fallbackIds =
      viewMode === "single" && singleModelId
        ? [singleModelId]
        : activeModels.map((m) => m.id);
    const effectiveModelIds =
      modelIds && modelIds.length > 0 ? modelIds : fallbackIds;

    if (effectiveModelIds.length === 0) return;

    // 1. Add user message to ALL target panels immediately.
    setMessages((prev) => {
      const next = { ...prev };
      for (const mid of effectiveModelIds) {
        next[mid] = [
          ...(next[mid] || []),
          { role: "user" as const, content: message },
        ];
      }
      return next;
    });

    // 2. Fire N independent HTTP requests in parallel.
    await Promise.all(
      effectiveModelIds.map((mid) => streamOneModel(mid, message, options)),
    );
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

  const handlePanelModelChange = (panelIndex: number, modelId: string) => {
    setPanelModelIds((prev) => {
      const next = prev.length > 0 ? [...prev] : [];
      while (next.length < selectedLayout) next.push("");
      next[panelIndex] = modelId;
      return next;
    });

    setSelectedModels((prev) => (prev.includes(modelId) ? prev : [...prev, modelId]));
    setActiveModelId(modelId);
  };

  const getGridCols = () => {
    if (selectedLayout === 1) return "grid-cols-1";
    if (selectedLayout === 2) return "grid-cols-2";
    if (selectedLayout === 3) return "grid-cols-3";
    if (selectedLayout === 4) return "grid-cols-2 grid-rows-2";
    return "grid-cols-3 grid-rows-2";
  };

  return (
    <div className="h-screen flex overflow-hidden">
      {/* Sidebar */}
      <Sidebar
        // In single mode, no layout is highlighted (pass 0 so none match).
        selectedLayout={viewMode === "all-in-one" ? selectedLayout : 0}
        onLayoutChange={handleLayoutChange}
        selectedModels={
          viewMode === "single" && singleModelId
            ? [singleModelId]
            : activeModels.map((m) => m.id)
        }
        onModelToggle={handleModelToggle}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 main-gradient">
        {/* Chat area — renders differently based on viewMode */}
        {viewMode === "single" ? (
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
                onActivate={() => setActiveModelId(singleModelView.id)}
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
                    onActivate={() => setActiveModelId(model.id)}
                    onModelChange={(newModelId) =>
                      handlePanelModelChange(idx, newModelId)
                    }
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

        {/* Input Area */}
        <div className="p-4 pt-0">
          <ChatInput
            onSendMessage={handleSendMessage}
            modelIds={
              viewMode === "single" && singleModelId
                ? [singleModelId]
                : activeModels.map((m) => m.id)
            }
          />
        </div>
      </div>

      {/* Welcome Dialog */}
      <WelcomeDialog open={showWelcome} onOpenChange={setShowWelcome} />
    </div>
  );
}
