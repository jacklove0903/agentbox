"use client";

import { useState, useEffect, useRef } from "react";
import { ChevronDown, RotateCcw, Trash2, Download, ThumbsUp } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { CodeBlock } from "@/components/CodeBlock";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Message {
  role: "user" | "assistant";
  content: string;
  isError?: boolean;
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
  onClear?: () => void;
  onRegenerate?: () => void;
  onVote?: () => void;
  hideModelSwitcher?: boolean;
  isStreaming?: boolean;
  votedModelId?: string | null;
}

export function ChatPanel({
  modelId,
  modelName,
  modelIcon,
  messages = [],
  active = false,
  onActivate,
  onModelChange,
  onClear,
  onRegenerate,
  onVote,
  hideModelSwitcher = false,
  isStreaming = false,
  votedModelId = null,
}: ChatPanelProps) {
  const [grouped, setGrouped] = useState<Record<string, ModelInfo[]>>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Clear any legacy cache to avoid showing stale icon URLs.
    localStorage.removeItem("groupedModels");
    fetch("http://localhost:8080/api/models/getmodelmap")
      .then((response) => response.json())
      .then((data: Record<string, ModelInfo[]>) => {
        setGrouped(data);
      })
      .catch((error) => console.error("Failed to fetch models:", error));
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div
      className={`relative h-full min-h-0 min-w-0 flex flex-col bg-white/80 dark:bg-neutral-900/80 backdrop-blur-sm rounded-2xl border shadow-sm overflow-hidden transition-all duration-200 focus-visible:outline-none ${
        active
          ? "border-blue-400/60 ring-2 ring-blue-200/50 shadow-blue-100/50 dark:border-blue-500/40 dark:ring-blue-900/30 z-10"
          : "border-gray-200/60 dark:border-neutral-700/60 hover:border-gray-300/80 dark:hover:border-neutral-600/80 z-0"
      }`}
      role="group"
      tabIndex={0}
      onPointerDownCapture={() => onActivate?.()}
      onFocus={() => onActivate?.()}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-100/80 dark:border-neutral-800/80 bg-white/60 dark:bg-neutral-900/60">
        {hideModelSwitcher ? (
          <div className="flex items-center gap-2 px-2 py-1.5">
            <img src={modelIcon} alt={modelName} className="w-5 h-5 rounded-md" />
            <span className="font-medium text-gray-800 dark:text-gray-200 text-sm">{modelName}</span>
          </div>
        ) : (
          <DropdownMenu>
            <DropdownMenuTrigger className="flex items-center gap-2 hover:bg-gray-100/60 rounded-lg px-2 py-1.5 transition-colors">
              <img src={modelIcon} alt={modelName} className="w-5 h-5 rounded-md" />
              <span className="font-medium text-gray-800 dark:text-gray-200 text-sm">{modelName}</span>
              <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-64 max-h-80 overflow-y-auto">
              {Object.entries(grouped).map(([provider, models]) => (
                <div key={provider}>
                  <div className="px-3 py-1.5 text-xs font-semibold text-gray-400 uppercase tracking-wider border-b border-gray-50 dark:border-neutral-800">
                    {provider}
                  </div>
                  {models.map((model) => (
                    <DropdownMenuItem
                      key={`${provider}-${model.id}`}
                      onSelect={() => onModelChange?.(model.id)}
                      className={`flex items-center gap-2 pl-4 ${
                        model.id === modelId ? "bg-blue-50 dark:bg-blue-900/30 text-blue-700" : ""
                      }`}
                    >
                      <img src={model.icon} alt={model.name} className="w-4 h-4 rounded" />
                      <span className="text-sm">{model.name}</span>
                    </DropdownMenuItem>
                  ))}
                </div>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        <div className="flex items-center gap-0.5">
          {isStreaming && (
            <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-blue-50 dark:bg-blue-900/30 mr-1">
              <div className="flex gap-0.5">
                <span className="w-1 h-1 bg-blue-400 rounded-full animate-bounce [animation-delay:0ms]" />
                <span className="w-1 h-1 bg-blue-400 rounded-full animate-bounce [animation-delay:150ms]" />
                <span className="w-1 h-1 bg-blue-400 rounded-full animate-bounce [animation-delay:300ms]" />
              </div>
              <span className="text-[10px] text-blue-500 dark:text-blue-400 font-medium">生成中</span>
            </div>
          )}
          <button
            type="button"
            onClick={() => onRegenerate?.()}
            disabled={isStreaming || !messages.some((m) => m.role === "user")}
            className="p-1.5 rounded-md hover:bg-gray-100/60 text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            title="重新生成"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => {
              if (messages.length === 0) return;
              const lines = [`# ${modelName} 对话导出\n`];
              messages.forEach((m) => {
                lines.push(m.role === "user" ? `## 👤 用户\n\n${m.content}\n` : `## 🤖 ${modelName}\n\n${m.content}\n`);
              });
              const blob = new Blob([lines.join("\n")], { type: "text/markdown" });
              const a = document.createElement("a");
              a.href = URL.createObjectURL(blob);
              a.download = `${modelName}-chat-${new Date().toISOString().slice(0, 10)}.md`;
              a.click();
              URL.revokeObjectURL(a.href);
            }}
            disabled={messages.length === 0}
            className="p-1.5 rounded-md hover:bg-gray-100/60 text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            title="导出 Markdown"
          >
            <Download className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => onClear?.()}
            disabled={messages.length === 0}
            className="p-1.5 rounded-md hover:bg-gray-100/60 text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            title="清空对话"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 min-h-0 overflow-y-auto px-4 py-3">
        {messages.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-center text-gray-400 dark:text-gray-200">
              <img src={modelIcon} alt={modelName} className="w-14 h-14 rounded-2xl mx-auto mb-3 opacity-40" />
              <p className="text-sm font-medium text-gray-500 dark:text-gray-200">{modelName}</p>
              <p className="text-xs text-gray-400 dark:text-gray-200 mt-1">输入消息开始对话</p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {messages.map((message, index) => (
              <div
                key={`msg-${message.role}-${index}`}
                className={`flex ${
                  message.role === "user" ? "justify-end" : "justify-start"
                } animate-fadeIn`}
              >
                {message.role === "assistant" && (
                  <img
                    src={modelIcon}
                    alt={modelName}
                    className="w-6 h-6 rounded-md mt-1 mr-2 flex-shrink-0"
                  />
                )}
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-2.5 ${
                    message.role === "user"
                      ? "bg-neutral-800 text-white rounded-br-md"
                      : message.isError
                        ? "bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 rounded-bl-md"
                        : "bg-gray-50 dark:bg-neutral-800 text-gray-800 dark:text-gray-200 border border-gray-100 dark:border-neutral-700 rounded-bl-md"
                  }`}
                >
                  {message.role === "assistant" && !message.isError ? (
                    <div className="prose prose-sm prose-gray max-w-none text-sm leading-relaxed [&>*:first-child]:mt-0 [&>*:last-child]:mb-0 [&_pre]:bg-gray-800 [&_pre]:text-gray-100 [&_pre]:rounded-lg [&_pre]:p-3 [&_pre]:text-xs [&_code]:text-xs [&_code]:bg-gray-200 [&_code]:px-1 [&_code]:py-0.5 [&_code]:rounded [&_p]:my-1.5 [&_ul]:my-1.5 [&_ol]:my-1.5 [&_li]:my-0.5">
                      <ReactMarkdown remarkPlugins={[remarkGfm]} components={{ code: CodeBlock }}>
                        {message.content}
                      </ReactMarkdown>
                    </div>
                  ) : (
                    <p className="text-sm leading-relaxed">{message.content}</p>
                  )}
                </div>
              </div>
            ))}
            {/* Vote button — show after last assistant message when not streaming */}
            {!isStreaming && messages.length > 0 && messages[messages.length - 1].role === "assistant" && !messages[messages.length - 1].isError && (
              <div className="flex justify-start pl-8 mt-1">
                <button
                  type="button"
                  onClick={() => onVote?.()}
                  disabled={!!votedModelId}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium transition-all ${
                    votedModelId === modelId
                      ? "bg-green-100 dark:bg-green-900/40 text-green-600 dark:text-green-400 border border-green-200 dark:border-green-800"
                      : votedModelId
                        ? "bg-gray-50 dark:bg-neutral-800 text-gray-300 dark:text-gray-600 border border-gray-100 dark:border-neutral-700 cursor-not-allowed"
                        : "bg-gray-50 dark:bg-neutral-800 text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-neutral-700 hover:bg-green-50 dark:hover:bg-green-900/20 hover:text-green-600 dark:hover:text-green-400 hover:border-green-200 dark:hover:border-green-800"
                  }`}
                  title={votedModelId === modelId ? "已投票" : votedModelId ? "已投给其他模型" : "选择最佳回答"}
                >
                  <ThumbsUp className="w-3 h-3" />
                  {votedModelId === modelId ? "最佳" : "投票"}
                </button>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>
    </div>
  );
}