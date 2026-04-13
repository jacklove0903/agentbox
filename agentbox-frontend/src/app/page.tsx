"use client";

import { useState } from "react";
import { ChatPanel } from "@/components/ChatPanel";
import { ChatInput } from "@/components/ChatInput";
import { WelcomeDialog } from "@/components/WelcomeDialog";
import { Sidebar } from "@/components/SideBar";

const defaultModels = [
  { id: "ernie-4.0", name: "文心一言 4.0", icon: "https://ext.same-assets.com/2425995810/1402690310.png" },
  { id: "tongyi-qianwen-2.5", name: "通义千问 2.5", icon: "https://ext.same-assets.com/2425995810/1402690310.png" },
];

interface Message {
  role: "user" | "assistant";
  content: string;
}

export default function Home() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [selectedLayout, setSelectedLayout] = useState(1);
  const [selectedModels, setSelectedModels] = useState<string[]>(["ernie-4.0", "tongyi-qianwen-2.5"]);
  const [showWelcome, setShowWelcome] = useState(false);
  const [messages, setMessages] = useState<Record<string, Message[]>>({});

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
          const modelName = defaultModels.find((m) => m.id === model)?.name || model;
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
    const allModels = [
      { id: "ernie-4.0", name: "文心一言 4.0", icon: "https://ext.same-assets.com/2425995810/1402690310.png" },
      { id: "tongyi-qianwen-2.5", name: "通义千问 2.5", icon: "https://ext.same-assets.com/2425995810/1402690310.png" },
      { id: "spark-4.0", name: "讯飞星火 4.0", icon: "https://ext.same-assets.com/2425995810/1402690310.png" },
      { id: "glm-4", name: "智谱清言 GLM-4", icon: "https://ext.same-assets.com/2425995810/1402690310.png" },
      { id: "doubao-3.0", name: "豆包 3.0", icon: "https://ext.same-assets.com/2425995810/1402690310.png" },
      { id: "hunyuan-2.0", name: "混元大模型 2.0", icon: "https://ext.same-assets.com/2425995810/1402690310.png" },
    ];

    return selectedModels
      .map((id) => allModels.find((m) => m.id === id))
      .filter(Boolean)
      .slice(0, selectedLayout) as typeof allModels;
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
                <p className="text-sm">Select models from the sidebar to start chatting</p>
              </div>
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="p-4 pt-0">
          <ChatInput onSendMessage={handleSendMessage} modelIds={selectedModels} />
        </div>
      </div>

      {/* Welcome Dialog */}
      <WelcomeDialog open={showWelcome} onOpenChange={setShowWelcome} />
    </div>
  );
}
