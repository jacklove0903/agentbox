"use client";

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

interface ChatPanelProps {
  modelId: string;
  modelName: string;
  modelIcon: string;
  messages?: Message[];
}

const availableModels = [
  { id: "gpt-5.4", name: "GPT-5.4", icon: "https://ext.same-assets.com/2425995810/1034974614.png" },
  { id: "gpt-5.4-thinking", name: "GPT-5.4 Thinking", icon: "https://ext.same-assets.com/2425995810/1034974614.png" },
  { id: "claude-sonnet-4.6", name: "Claude Sonnet 4.6", icon: "https://ext.same-assets.com/2425995810/232058226.png" },
  { id: "gemini-3.1-pro", name: "Gemini 3.1 Pro", icon: "https://ext.same-assets.com/2425995810/2254660124.png" },
  { id: "gemini-3-flash", name: "Gemini 3 Flash", icon: "https://ext.same-assets.com/2425995810/2254660124.png" },
  { id: "grok-4.1-fast", name: "Grok 4.1 Fast", icon: "https://ext.same-assets.com/2425995810/497172073.png" },
];

export function ChatPanel({
  modelName,
  modelIcon,
  messages = [],
}: ChatPanelProps) {
  return (
    <div className="h-full flex flex-col bg-white/70 backdrop-blur-sm rounded-xl border border-white/60 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100/50">
        <DropdownMenu>
          <DropdownMenuTrigger className="flex items-center gap-2 hover:bg-gray-100/50 rounded-lg px-2 py-1.5 transition-colors">
            <img src={modelIcon} alt={modelName} className="w-5 h-5 rounded" />
            <span className="font-medium text-gray-800 text-sm">{modelName}</span>
            <ChevronDown className="w-4 h-4 text-gray-400" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-48">
            {availableModels.map((model) => (
              <DropdownMenuItem key={model.id} className="flex items-center gap-2">
                <img src={model.icon} alt={model.name} className="w-4 h-4 rounded" />
                <span>{model.name}</span>
              </DropdownMenuItem>
            ))}
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
      <div className="flex-1 overflow-y-auto p-4">
        {messages.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-center text-gray-400">
              <img
                src={modelIcon}
                alt={modelName}
                className="w-12 h-12 rounded-xl mx-auto mb-3 opacity-50"
              />
              <p className="text-sm">Start a conversation with {modelName}</p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((message, index) => (
              <div
                key={`message-${message.role}-${index}`}
                className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
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
