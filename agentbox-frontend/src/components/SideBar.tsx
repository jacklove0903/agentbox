"use client";

import { useState, useEffect } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  ChevronLeft,
  Image,
  Languages,
  Globe,
  FileText,
  MessageSquare,
  User,
  Settings,
} from "lucide-react";

// Define the ModelInfo interface to match the backend DTO
interface ModelInfo {
  id: string;
  name: string;
  icon: string;
}

// Layout icons for All-In-One section
const layoutOptions = [
  { id: 1, cols: 1, icon: "single" },
  { id: 2, cols: 2, icon: "double" },
  { id: 3, cols: 3, icon: "triple" },
  { id: 4, cols: 4, icon: "quad" },
  { id: 5, cols: 6, icon: "six" },
];

const tools = [
  { id: "image-gen", name: "Image Generator", icon: Image },
  { id: "translator", name: "AI Translator", icon: Languages },
  { id: "summarizer", name: "Web Summarizer", icon: Globe },
];

interface SidebarProps {
  selectedLayout: number;
  onLayoutChange: (layout: number) => void;
  selectedModels: string[];
  onModelToggle: (modelId: string) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
}

export function Sidebar({
  selectedLayout,
  onLayoutChange,
  selectedModels,
  onModelToggle,
  collapsed,
  onToggleCollapse,
}: SidebarProps) {
  const [showAllModels, setShowAllModels] = useState(false);
  const [models, setModels] = useState<ModelInfo[]>([]);

  // Fetch models from the backend API
  useEffect(() => {
    async function fetchModels() {
      try {
        const response = await fetch("http://localhost:8080/api/models/getmodels");
        const data = await response.json();
        setModels(data);
      } catch (error) {
        console.error("Error fetching models:", error);
      }
    }

    fetchModels();
  }, []);

  const displayedModels = showAllModels ? models : models.slice(0, 6);

  return (
    <div
      className={`h-full bg-white/95 backdrop-blur-sm border-r border-gray-100 flex flex-col transition-all duration-300 ${
        collapsed ? "w-16" : "w-64"
      }`}
    >
      {/* Header with Logo */}
      <div className="p-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <img
            src="https://ext.same-assets.com/2425995810/2396580476.svg"
            alt="ChatHub Logo"
            className="w-6 h-6"
          />
          <img
            src="https://ext.same-assets.com/2425995810/2218609143.svg"
            alt="ChatHub"
            className={`h-5 transition-opacity ${collapsed ? "opacity-0 w-0" : "opacity-100"}`}
          />
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
          <div className="sidebar-item bg-secondary/50 mb-2">
            <div className="w-5 h-5 rounded bg-neutral-800 flex items-center justify-center">
              <span className="text-white text-xs">A</span>
            </div>
            <span className="font-medium text-gray-700">All-In-One</span>
          </div>

          {/* Layout Options */}
          <div className="flex gap-1.5 px-2">
            {layoutOptions.map((option) => (
              <button
                type="button"
                key={option.id}
                onClick={() => onLayoutChange(option.cols)}
                className={`p-2 rounded-md border transition-all ${
                  selectedLayout === option.cols
                    ? "border-neutral-800 bg-neutral-100"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <div className="flex gap-0.5">
                  {Array.from({ length: Math.min(option.cols, 4) }).map((_, i) => (
                    <div
                      key={`${option.id}-${i}`}
                      className={`w-1.5 h-4 rounded-sm ${
                        selectedLayout === option.cols ? "bg-neutral-800" : "bg-gray-300"
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
              className="sidebar-item w-full text-left text-gray-600 hover:text-gray-900"
            >
              <tool.icon className="w-5 h-5 text-gray-400" />
              <span>{tool.name}</span>
            </button>
          ))}
        </div>

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
                  ? "bg-neutral-100 text-neutral-900"
                  : "text-gray-600 hover:text-gray-900"
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
              className="text-sm text-neutral-600 hover:text-neutral-800 px-3 py-2 transition-colors"
            >
              Show All
            </button>
          )}
        </div>
      </ScrollArea>

      {/* Bottom Section */}
      <div className={`p-3 border-t border-gray-100 ${collapsed ? "hidden" : ""}`}>
        <Button className="w-full mb-2 bg-neutral-800 hover:bg-neutral-900 text-white rounded-lg h-10">
          Sign up
        </Button>
        <Button
          variant="outline"
          className="w-full border-gray-200 text-gray-600 hover:bg-gray-50 rounded-lg h-10"
        >
          Sign in
        </Button>
      </div>

      {/* Bottom Icons */}
      <div className={`p-3 flex justify-around border-t border-gray-100 ${collapsed ? "hidden" : ""}`}>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <button type="button" className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors">
                <FileText className="w-5 h-5" />
              </button>
            </TooltipTrigger>
            <TooltipContent>Documents</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <button type="button" className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors">
                <MessageSquare className="w-5 h-5" />
              </button>
            </TooltipTrigger>
            <TooltipContent>Support</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <button type="button" className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors">
                <User className="w-5 h-5" />
              </button>
            </TooltipTrigger>
            <TooltipContent>Profile</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <button type="button" className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors">
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