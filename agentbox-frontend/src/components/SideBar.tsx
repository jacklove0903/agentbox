"use client";

import { useState, useEffect } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  ChevronLeft,
  Image,
  Languages,
  Globe,
  Sparkles,
  FileText,
  MessageSquare,
  User,
  Settings,
  LogOut,
  Moon,
  Sun,
  Plus,
  Trash2,
  Edit3,
  Check,
  X,
  Trophy,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useTheme } from "@/lib/theme";
import { apiFetch } from "@/lib/api";

// Define the ModelInfo interface to match the backend DTO
interface ModelInfo {
  id: string;
  name: string;
  icon: string;
}

// Layout icons for All-In-One section
const layoutOptions = [
  { id: 1, cols: 1, bars: 1 },
  { id: 2, cols: 2, bars: 2 },
  { id: 3, cols: 3, bars: 3 },
  { id: 4, cols: 4, bars: 4 },
  { id: 5, cols: 6, bars: 5 },
];

const tools = [
  { id: "image-gen", name: "Image Generator", icon: Image },
  { id: "translator", name: "AI Translator", icon: Languages },
  { id: "summarizer", name: "Web Summarizer", icon: Globe },
  { id: "leaderboard", name: "Model Leaderboard", icon: Trophy },
];

export interface ConversationInfo {
  id: string;
  title: string;
  updatedAt: string;
}

interface SidebarProps {
  selectedLayout: number;
  onLayoutChange: (layout: number) => void;
  selectedModels: string[];
  onModelToggle: (modelId: string) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
  activeTool?: string | null;
  onToolSelect?: (toolId: string | null) => void;
  conversations: ConversationInfo[];
  activeConversationId: string | null;
  onConversationSelect: (id: string | null) => void;
  onConversationCreate: () => void;
  onConversationDelete: (id: string) => void;
  onConversationRename: (id: string, title: string) => void;
}

export function Sidebar({
  selectedLayout,
  onLayoutChange,
  selectedModels,
  onModelToggle,
  collapsed,
  onToggleCollapse,
  activeTool,
  onToolSelect,
  conversations,
  activeConversationId,
  onConversationSelect,
  onConversationCreate,
  onConversationDelete,
  onConversationRename,
}: SidebarProps) {
  const [showAllModels, setShowAllModels] = useState(false);
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const { user, logout } = useAuth();
  const themeCtx = useTheme();

  // Fetch models from the backend API
  useEffect(() => {
    async function fetchModels() {
      try {
        const response = await apiFetch("/api/models/getmodels");
        const data = await response.json();
        setModels(data);
      } catch (error) {
        console.error("Error fetching models:", error);
      }
    }

    fetchModels();
  }, []);

  const displayedModels = showAllModels ? models : models.slice(0, 6);

  // Helper for relative time
  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    if (diff < 60000) return "刚刚";
    if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`;
    return `${Math.floor(diff / 86400000)}天前`;
  };

  return (
    <div
      className={`h-full bg-white/95 dark:bg-neutral-900/95 backdrop-blur-sm border-r border-gray-100 dark:border-neutral-800 flex flex-col transition-all duration-300 ${
        collapsed ? "w-16" : "w-64"
      }`}
    >
      {/* Header with Logo */}
      <div className="p-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-sky-500 via-indigo-500 to-fuchsia-500 flex items-center justify-center shadow-sm">
            <Sparkles className="w-4.5 h-4.5 text-white" />
          </div>
          <div className={`transition-opacity ${collapsed ? "opacity-0 w-0" : "opacity-100"}`}>
            <div className="text-sm font-semibold tracking-tight text-gray-900 dark:text-gray-100 leading-none">
              AgentBox
            </div>
            <div className="text-[11px] text-gray-400 dark:text-gray-500 leading-none mt-0.5">
              Multi-Chat
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={onToggleCollapse}
          className="p-1.5 rounded-md hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <ChevronLeft className={`w-4 h-4 transition-transform ${collapsed ? "rotate-180" : ""}`} />
        </button>
      </div>

      <ScrollArea className="flex-1 px-3">
        {/* All-In-One Section */}
        <div className={`mb-6 ${collapsed ? "hidden" : ""}`}>
          <div className="sidebar-item bg-secondary/50 dark:bg-neutral-800/50 mb-2">
            <div className="w-5 h-5 rounded bg-neutral-800 dark:bg-neutral-700 flex items-center justify-center">
              <span className="text-white text-xs">A</span>
            </div>
            <span className="font-medium text-gray-700 dark:text-gray-300">Multi-Chat</span>
          </div>

          {/* Layout Options */}
          <div className="inline-flex gap-1.5 p-1.5 rounded-2xl bg-gray-50/80 dark:bg-neutral-800/50 border border-gray-200/80 dark:border-neutral-700/70">
            {layoutOptions.map((option) => (
              <button
                type="button"
                key={option.id}
                onClick={() => onLayoutChange(option.cols)}
                title={`${option.cols} 窗格布局`}
                className={`h-8 px-2.5 rounded-xl border transition-all duration-200 ${
                  selectedLayout === option.cols
                    ? "border-gray-300 dark:border-neutral-500 bg-white dark:bg-neutral-700 text-gray-700 dark:text-gray-100"
                    : "border-gray-200/90 dark:border-neutral-700 bg-white/60 dark:bg-neutral-800/60 text-gray-400 dark:text-gray-500 hover:border-gray-300 dark:hover:border-neutral-600 hover:bg-white dark:hover:bg-neutral-700/70"
                }`}
              >
                <div className="flex items-center justify-center gap-0.5 h-full">
                  {Array.from({ length: option.bars }).map((_, i) => (
                    <div
                      key={`${option.id}-${i}`}
                      className={`w-1 h-3.5 rounded-full transition-colors ${
                        selectedLayout === option.cols ? "bg-gray-500 dark:bg-gray-300" : "bg-gray-300 dark:bg-neutral-500"
                      }`}
                    />
                  ))}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Tools Section */}
        <div className={`mb-6 ${collapsed ? "hidden" : ""}`}>
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide px-3 mb-2">
            Tools
          </h3>
          {tools.map((tool) => (
            <button
              type="button"
              key={tool.id}
              onClick={() => onToolSelect?.(activeTool === tool.id ? null : tool.id)}
              className={`sidebar-item w-full text-left ${
                activeTool === tool.id
                  ? "bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-gray-100"
                  : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
              }`}
            >
              <tool.icon className={`w-5 h-5 ${
                activeTool === tool.id ? "text-neutral-700 dark:text-gray-300" : "text-gray-400 dark:text-gray-500"
              }`} />
              <span>{tool.name}</span>
            </button>
          ))}
        </div>

        {/* Conversations Section */}
        {!activeTool && (
          <div className={`mb-6 ${collapsed ? "hidden" : ""}`}>
            <div className="flex items-center justify-between px-3 mb-2">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                对话
              </h3>
              <button
                type="button"
                onClick={onConversationCreate}
                className="p-1 rounded-md hover:bg-gray-100 dark:hover:bg-neutral-800 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                title="新建对话"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="space-y-0.5 max-h-[240px] overflow-y-auto">
              {conversations.length === 0 ? (
                <p className="text-xs text-gray-400 px-3 py-2">暂无对话</p>
              ) : (
                conversations.map((conv) => (
                  <div
                    key={conv.id}
                    className={`group flex items-center gap-1.5 px-3 py-1.5 rounded-lg cursor-pointer transition-all text-sm ${
                      activeConversationId === conv.id
                        ? "bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-gray-100"
                        : "text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-neutral-800/50 hover:text-gray-900 dark:hover:text-gray-200"
                    }`}
                    onClick={() => {
                      if (editingId !== conv.id) {
                        onConversationSelect(conv.id);
                      }
                    }}
                  >
                    {editingId === conv.id ? (
                      <>
                        <input
                          type="text"
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              onConversationRename(conv.id, editTitle);
                              setEditingId(null);
                            } else if (e.key === "Escape") {
                              setEditingId(null);
                            }
                          }}
                          className="flex-1 min-w-0 text-sm bg-white dark:bg-neutral-700 border border-gray-300 dark:border-neutral-600 rounded px-1.5 py-0.5 outline-none focus:ring-1 focus:ring-blue-400"
                          autoFocus
                          onClick={(e) => e.stopPropagation()}
                        />
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onConversationRename(conv.id, editTitle);
                            setEditingId(null);
                          }}
                          className="p-0.5 text-green-500 hover:text-green-700"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingId(null);
                          }}
                          className="p-0.5 text-gray-400 hover:text-gray-600"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </>
                    ) : (
                      <>
                        <MessageSquare className="w-3.5 h-3.5 flex-shrink-0 opacity-40" />
                        <span className="flex-1 min-w-0 truncate">{conv.title}</span>
                        <div className="hidden group-hover:flex items-center gap-0.5">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingId(conv.id);
                              setEditTitle(conv.title);
                            }}
                            className="p-0.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                          >
                            <Edit3 className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onConversationDelete(conv.id);
                            }}
                            className="p-0.5 text-gray-400 hover:text-red-500"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Models Section */}
        <div className={collapsed ? "hidden" : ""}>
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide px-3 mb-2">
            Models
          </h3>
          {displayedModels.map((model) => (
            <button
              type="button"
              key={model.id}
              onClick={() => onModelToggle(model.id)}
              className={`sidebar-item w-full text-left ${
                selectedModels.includes(model.id)
                  ? "bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-gray-100"
                  : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
              }`}
            >
              <img src={model.icon} alt={model.name} className="w-5 h-5 rounded" />
              <span>{model.name}</span>
            </button>
          ))}

          {!showAllModels && models.length > 6 && (
            <button
              type="button"
              onClick={() => setShowAllModels(true)}
              className="text-sm text-neutral-600 dark:text-gray-400 hover:text-neutral-800 dark:hover:text-gray-200 px-3 py-2 transition-colors"
            >
              Show All
            </button>
          )}
        </div>
      </ScrollArea>

      {/* Current user + logout */}
      <div className={`p-3 border-t border-gray-100 dark:border-neutral-800 ${collapsed ? "hidden" : ""}`}>
        <div className="flex items-center gap-2 px-1">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-fuchsia-500 flex items-center justify-center text-white text-sm font-semibold flex-shrink-0">
            {user?.username?.charAt(0).toUpperCase() ?? "?"}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">{user?.username ?? "未登录"}</div>
            {user?.email && (
              <div className="text-[11px] text-gray-400 dark:text-gray-500 truncate">{user.email}</div>
            )}
          </div>
          <button
            type="button"
            onClick={logout}
            className="p-1.5 rounded-md hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
            title="退出登录"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Bottom Icons */}
      <div className={`p-3 flex justify-around border-t border-gray-100 dark:border-neutral-800 ${collapsed ? "hidden" : ""}`}>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <button type="button" className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-neutral-800 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
                <FileText className="w-5 h-5" />
              </button>
            </TooltipTrigger>
            <TooltipContent>Documents</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <button type="button" className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-neutral-800 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
                <MessageSquare className="w-5 h-5" />
              </button>
            </TooltipTrigger>
            <TooltipContent>Support</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <button type="button" className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-neutral-800 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
                <User className="w-5 h-5" />
              </button>
            </TooltipTrigger>
            <TooltipContent>Profile</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <button type="button" onClick={() => themeCtx.toggle()} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-neutral-800 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
                {themeCtx.theme === "dark" ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </button>
            </TooltipTrigger>
            <TooltipContent>{themeCtx.theme === "dark" ? "切换亮色" : "切换暗色"}</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <button type="button" className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-neutral-800 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
                <Settings className="w-5 h-5" />
              </button>
            </TooltipTrigger>
            <TooltipContent>Settings</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </div>
  );
}