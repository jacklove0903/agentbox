"use client";

import { useState, useEffect } from "react";
import { ChevronDown, Share2, Copy } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface ModelInfo {
  id: string;
  name: string;
  icon: string;
}

interface ChatPanelProps {
  modelId: string;
  modelName: string;
  modelIcon: string;
  messages?: Message[];
  active?: boolean;
  onActivate?: () => void;
  onModelChange?: (modelId: string) => void;
}

export function ChatPanel({
  modelId,
  modelName,
  modelIcon,
  messages = [],
  active = false,
  onActivate,
  onModelChange,
}: ChatPanelProps) {
  const [grouped, setGrouped] = useState<Record<string, ModelInfo[]>[]>([]);

  useEffect(() => {
    const cached = localStorage.getItem("groupedModels");
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        setGrouped(parsed);
      } catch (error) {
        console.error("Failed to parse cached data:", error);
        localStorage.removeItem("groupedModels");
      }
    } else {
      fetch("http://localhost:8080/api/models/getmodelmap")
        .then((response) => response.json())
        .then((data: Record<string, ModelInfo[]>[]) => {
          setGrouped(data);
          localStorage.setItem("groupedModels", JSON.stringify(data));
        })
        .catch((error) => console.error("Failed to fetch models:", error));
    }
  }, []);

  return (
    <div
      className={`relative h-full min-h-0 min-w-0 flex flex-col bg-white/70 backdrop-blur-sm rounded-xl border shadow-sm overflow-hidden transition-colors focus-visible:outline-none ${
        active
          ? "border-sky-400/70 ring-2 ring-sky-300/70 z-10"
          : "border-white/60 hover:border-gray-200 z-0"
      }`}
      role="group"
      tabIndex={0}
      onPointerDownCapture={() => onActivate?.()}
      onFocus={() => onActivate?.()}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100/50">
        <DropdownMenu>
          <DropdownMenuTrigger className="flex items-center gap-2 hover:bg-gray-100/50 rounded-lg px-2 py-1.5 transition-colors">
            <img src={modelIcon} alt={modelName} className="w-5 h-5 rounded" />
            <span className="font-medium text-gray-800 text-sm">
              {modelName}
            </span>
            <ChevronDown className="w-4 h-4 text-gray-400" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-64 max-h-80 overflow-y-auto">
            {grouped.map((group, index) => {
              const provider = Object.keys(group)[0];
              const models = Object.values(group)[0];
              return (
                <div key={index}>
                  <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase border-b border-gray-100">
                    {provider}
                  </div>
                  {models.map((model) => (
                    <DropdownMenuItem
                      key={`${provider}-${model.id}`}
                      onSelect={() => onModelChange?.(model.id)}
                      className={`flex items-center gap-2 pl-4 ${
                        model.id === modelId ? "bg-accent" : ""
                      }`}
                    >
                      <img
                        src={model.icon}
                        alt={model.name}
                        className="w-4 h-4 rounded"
                      />
                      <span>{model.name}</span>
                    </DropdownMenuItem>
                  ))}
                </div>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>

        <div className="flex items-center gap-1">
          <button
            type="button"
            className="p-2 rounded-lg hover:bg-gray-100/50 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <Share2 className="w-4 h-4" />
          </button>
          <button
            type="button"
            className="p-2 rounded-lg hover:bg-gray-100/50 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <Copy className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 min-h-0 overflow-y-auto p-4">
        {messages.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-center text-gray-400">
              <img
                src={modelIcon}
                alt={modelName}
                className="w-12 h-12 rounded-xl mx-auto mb-3 opacity-50"
              />
              <p className="text-sm">
                Start a conversation with {modelName}
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((message, index) => (
              <div
                key={`message-${message.role}-${index}`}
                className={`flex ${
                  message.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                    message.role === "user"
                      ? "bg-neutral-800 text-white"
                      : "bg-gray-100 text-gray-800"
                  }`}
                >
                  <p className="text-sm leading-relaxed">{message.content}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}