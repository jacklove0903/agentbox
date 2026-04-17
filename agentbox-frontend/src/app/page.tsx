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

export default function Home() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [selectedLayout, setSelectedLayout] = useState(1);
  const [selectedModels, setSelectedModels] = useState<string[]>([]);
  const [showWelcome, setShowWelcome] = useState(false);
  const [messages, setMessages] = useState<Record<string, Message[]>>({});
  const [allModels, setAllModels] = useState<ModelInfo[]>([]);

  useEffect(() => {
    const cached = localStorage.getItem("groupedModels");
    if (cached) {
      try {
        const grouped: Record<string, ModelInfo[]>[] = JSON.parse(cached);
        const allModels = grouped.flatMap((group) => Object.values(group)[0]);
        setAllModels(allModels);
        // Set default selected models if none selected
        if (selectedModels.length === 0 && allModels.length > 0) {
          setSelectedModels([allModels[0].id]); // Select first model as default
        }
      } catch (error) {
        console.error("Failed to parse cached data:", error);
      }
    }
  }, []);

  const handleModelToggle = (modelId: string) => {
    setSelectedModels((prev) => {
      if (prev.includes(modelId)) {
        return prev.filter((id) => id !== modelId);
      }
      return [...prev, modelId];
    });
  };

  const handleSendMessage = (message: string) => {
    // Add user message to all active panels
    const newMessages = { ...messages };
    for (const model of selectedModels) {
      if (!newMessages[model]) {
        newMessages[model] = [];
      }
      newMessages[model] = [
        ...newMessages[model],
        { role: "user" as const, content: message },
      ];
    }
    setMessages(newMessages);

    // Simulate AI responses
    setTimeout(() => {
      setMessages((prev) => {
        const updated = { ...prev };
        for (const model of selectedModels) {
          const modelData = allModels.find((m) => m.id === model);
          const modelName = modelData?.name || model;
          updated[model] = [
            ...(updated[model] || []),
            {
              role: "assistant" as const,
              content: `This is a simulated response from ${modelName}. In a real implementation, this would be connected to the actual AI model API.`,
            },
          ];
        }
        return updated;
      });
    }, 1000);
  };

  const getActiveModels = () => {
    return selectedModels
      .map((id) => allModels.find((m) => m.id === id))
      .filter(Boolean)
      .slice(0, selectedLayout) as ModelInfo[];
  };

  const activeModels = getActiveModels();

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
      <div className="flex-1 flex flex-col main-gradient">
        {/* Chat Panels Grid */}
        <div className={`flex-1 p-4 grid gap-4 ${getGridCols()}`}>
          {activeModels.length > 0 ? (
            activeModels.map((model) => (
              <ChatPanel
                key={model.id}
                modelId={model.id}
                modelName={model.name}
                modelIcon={model.icon}
                messages={messages[model.id] || []}
              />
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
            modelIds={selectedModels}
          />
        </div>
      </div>

      {/* Welcome Dialog */}
      <WelcomeDialog open={showWelcome} onOpenChange={setShowWelcome} />
    </div>
  );
}
