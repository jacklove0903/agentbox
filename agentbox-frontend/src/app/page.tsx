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
}

interface MessageResponse {
  responses: Record<
    string,
    {
      content: string;
      timestamp: string;
    }
  >;
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

  useEffect(() => {
    let cancelled = false;

    async function loadModels() {
      try {
        // 1) Prefer cached grouped models (if ChatPanel already fetched them)
        const cached = localStorage.getItem("groupedModels");
        if (cached) {
          const grouped: Record<string, ModelInfo[]>[] = JSON.parse(cached);
          const flattened = grouped.flatMap((group) => Object.values(group)[0]);
          if (!cancelled) {
            setAllModels(flattened);
            setSelectedModels((prev) =>
              prev.length === 0 && flattened.length > 0 ? [flattened[0].id] : prev
            );
            setLoading(false);
          }
          return;
        }

        // 2) Fallback: fetch model list directly so layout switching works immediately
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

  const handleModelToggle = (modelId: string) => {
    setSelectedModels((prev) => {
      if (prev.includes(modelId)) {
        return prev.filter((id) => id !== modelId);
      }
      return [...prev, modelId];
    });
  };

  const handleSendMessage = async (params: {
    message: string;
    modelIds: string[];
    options: { webSearch: boolean; imageGen: boolean };
  }) => {
    const { message, modelIds, options } = params;
    const activeModels = getActiveModels();
    const targetModelId =
      activeModelId && activeModels.some((m) => m.id === activeModelId)
        ? activeModelId
        : activeModels[0]?.id;

    // Add user message to the active panel (fallback: first visible panel)
    if (targetModelId) {
      setMessages((prev) => {
        const next = { ...prev };
        next[targetModelId] = [
          ...(next[targetModelId] || []),
          { role: "user" as const, content: message },
        ];
        return next;
      });
    }

    const effectiveModelIds =
      modelIds && modelIds.length > 0 ? modelIds : targetModelId ? [targetModelId] : [];

    if (effectiveModelIds.length === 0) return;

    const res = await fetch("http://localhost:8080/api/chat/message", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: "demo",
        message,
        modelIds: effectiveModelIds,
        options,
      }),
    });

    if (!res.ok) {
      throw new Error(`chat request failed: ${res.status}`);
    }

    const data = (await res.json()) as MessageResponse;

    setMessages((prev) => {
      const next = { ...prev };
      for (const [mid, mr] of Object.entries(data.responses || {})) {
        next[mid] = [
          ...(next[mid] || []),
          { role: "assistant" as const, content: mr.content },
        ];
      }
      return next;
    });
  };

  const getActiveModels = () => {
    return selectedModels
      .map((id) => allModels.find((m) => m.id === id))
      .filter(Boolean)
      .slice(0, selectedLayout) as ModelInfo[];
  };

  // Panel model ids drive what each visible panel shows.
  const visiblePanelModelIds = panelModelIds.slice(0, selectedLayout);
  const activeModels = visiblePanelModelIds
    .map((id) => allModels.find((m) => m.id === id))
    .filter(Boolean) as ModelInfo[];
  const activeVisibleModelId =
    (activeModelId && activeModels.some((m) => m.id === activeModelId)
      ? activeModelId
      : activeModels[0]?.id) ?? null;

  useEffect(() => {
    // When layout increases, auto-fill selected models so the UI can actually show N panels.
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
      // Ensure we have enough ids to cover selectedLayout.
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
    if (activeModels.length === 0) {
      setActiveModelId(null);
      return;
    }
    setActiveModelId((prev) => {
      if (prev && activeModels.some((m) => m.id === prev)) return prev;
      return activeModels[0].id;
    });
  }, [selectedLayout, selectedModels, allModels.length]);

  const handlePanelModelChange = (panelIndex: number, modelId: string) => {
    setPanelModelIds((prev) => {
      const next = prev.length > 0 ? [...prev] : [];
      while (next.length < selectedLayout) next.push("");
      next[panelIndex] = modelId;
      return next;
    });

    // Keep sidebar selection consistent: if user picks a model via panel dropdown, add it.
    setSelectedModels((prev) => (prev.includes(modelId) ? prev : [...prev, modelId]));
    setActiveModelId(modelId);
  };

  // Determine grid columns based on layout
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
        selectedLayout={selectedLayout}
        onLayoutChange={setSelectedLayout}
        selectedModels={selectedModels}
        onModelToggle={handleModelToggle}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 main-gradient">
        {/* Chat Panels Grid */}
        <div className={`flex-1 min-h-0 p-4 grid gap-4 ${getGridCols()}`}>
          {loading ? (
            <div className="col-span-full flex items-center justify-center">
              <div className="text-center text-neutral-500">
                <p className="text-lg font-medium mb-2">Loading models...</p>
                <p className="text-sm">
                  Please wait while we fetch the available models
                </p>
              </div>
            </div>
          ) : activeModels.length > 0 ? (
            activeModels.map((model, idx) => (
              <div key={model.id} className="min-h-0 min-w-0">
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
                <p className="text-lg font-medium mb-2">No models selected</p>
                <p className="text-sm">
                  Select models from the sidebar to start chatting
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="p-4 pt-0">
          <ChatInput
            onSendMessage={handleSendMessage}
            modelIds={activeVisibleModelId ? [activeVisibleModelId] : []}
          />
        </div>
      </div>

      {/* Welcome Dialog */}
      <WelcomeDialog open={showWelcome} onOpenChange={setShowWelcome} />
    </div>
  );
}