"use client";

import { useState, useRef, useEffect } from "react";
import { Globe, ImagePlus, Wand2, Image, Send, Maximize2, Minimize2, Copy, Loader2, X, Brain, Square } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { apiFetch } from "@/lib/api";

interface ChatInputProps {
  onSendMessage: (params: {
    message: string;
    modelIds: string[];
    options: { webSearch: boolean; imageGen: boolean; enableThinking: boolean };
    imageUrls?: string[];
  }) => Promise<void> | void;
  modelIds: string[];
  isStreaming?: boolean;
  onStop?: () => void;
}

export function ChatInput({ onSendMessage, modelIds, isStreaming, onStop }: ChatInputProps) {
  const [message, setMessage] = useState("");
  const [webSearchEnabled, setWebSearchEnabled] = useState(false);
  const [imageGenEnabled, setImageGenEnabled] = useState(false);
  const [thinkingEnabled, setThinkingEnabled] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attachedImages, setAttachedImages] = useState<{ file: File; preview: string }[]>([]);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const uploadImages = async (): Promise<string[]> => {
    if (attachedImages.length === 0) return [];
    const urls: string[] = [];
    for (const img of attachedImages) {
      const formData = new FormData();
      formData.append("file", img.file);
      const res = await apiFetch("/api/files/upload", {
        method: "POST",
        body: formData,
      });
      if (!res.ok) {
        const errText = await res.text().catch(() => "");
        throw new Error(`图片上传失败 (${res.status}): ${errText || res.statusText}`);
      }
      const data = await res.json();
      if (!data.url) {
        throw new Error("上传响应缺少 url 字段");
      }
      urls.push(data.url);
    }
    return urls;
  };

  const handleSubmit = async () => {
    if (!message.trim() && attachedImages.length === 0) return;

    setIsLoading(true);
    setError(null);

    try {
      const imageUrls = await uploadImages();
      await onSendMessage({
        message: message.trim() || "请查看图片",
        modelIds,
        options: {
          webSearch: webSearchEnabled,
          imageGen: imageGenEnabled,
          enableThinking: thinkingEnabled,
        },
        imageUrls: imageUrls.length > 0 ? imageUrls : undefined,
      });
      setMessage("");
      setAttachedImages((prev) => {
        prev.forEach((img) => URL.revokeObjectURL(img.preview));
        return [];
      });
    } catch (err) {
      console.error('Error sending message:', err);
      setError('发送失败，请重试');
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleEnhance = async () => {
    if (!message.trim() || isEnhancing) return;
    setIsEnhancing(true);
    try {
      const res = await apiFetch("/api/chat/enhance", {
        method: "POST",
        body: JSON.stringify({ prompt: message.trim() }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.enhanced) setMessage(data.enhanced);
      }
    } catch (e) {
      console.error("Enhance failed:", e);
    } finally {
      setIsEnhancing(false);
    }
  };

  // Accepted by backend: image/* only; must be ≤ 2MB (matches FileController.MAX_FILE_SIZE)
  const MAX_IMAGE_BYTES = 2 * 1024 * 1024;
  const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

  // Validate + append files to the attached list. Used by file picker, paste, and drag-drop.
  const addFiles = (files: File[]) => {
    if (files.length === 0) return;
    setError(null);
    const rejected: string[] = [];
    const accepted: { file: File; preview: string }[] = [];
    files.forEach((file) => {
      if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
        rejected.push(`${file.name || "(未命名)"}（类型不支持）`);
        return;
      }
      if (file.size > MAX_IMAGE_BYTES) {
        rejected.push(`${file.name}（${(file.size / 1024 / 1024).toFixed(2)}MB，超过 2MB）`);
        return;
      }
      accepted.push({ file, preview: URL.createObjectURL(file) });
    });
    if (accepted.length > 0) {
      setAttachedImages((prev) => [...prev, ...accepted]);
    }
    if (rejected.length > 0) {
      setError(`以下文件被拒绝：${rejected.join("、")}（仅支持 jpg/png/webp/gif，最大 2MB）`);
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    addFiles(Array.from(e.target.files));
    e.target.value = "";
  };

  // Paste handler: grab any image(s) from the clipboard and attach them.
  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    const imageFiles: File[] = [];
    for (const item of items) {
      if (item.kind === "file" && item.type.startsWith("image/")) {
        const f = item.getAsFile();
        if (f) imageFiles.push(f);
      }
    }
    if (imageFiles.length > 0) {
      e.preventDefault();
      addFiles(imageFiles);
    }
  };

  // Drag-and-drop handlers on the whole input wrapper.
  const [isDragging, setIsDragging] = useState(false);
  const handleDragOver = (e: React.DragEvent) => {
    if (e.dataTransfer.types.includes("Files")) {
      e.preventDefault();
      setIsDragging(true);
    }
  };
  const handleDragLeave = (e: React.DragEvent) => {
    // Only unset when leaving the wrapper itself (not bubbling from a child).
    if (e.currentTarget === e.target) setIsDragging(false);
  };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files || []);
    if (files.length > 0) addFiles(files);
  };

  const removeImage = (index: number) => {
    setAttachedImages((prev) => {
      URL.revokeObjectURL(prev[index].preview);
      return prev.filter((_, i) => i !== index);
    });
  };

  useEffect(() => {
    const onFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", onFullscreenChange);
  }, []);

  const handleToggleFullscreen = async () => {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else {
        await document.documentElement.requestFullscreen();
      }
    } catch (e) {
      console.error("Fullscreen toggle failed:", e);
      setError("无法切换全屏，请检查浏览器权限");
    }
  };

  return (
    <div
      className={`relative bg-white/90 dark:bg-neutral-900/90 backdrop-blur-md rounded-2xl shadow-lg border p-3 transition-colors ${
        isDragging
          ? "border-blue-400 border-dashed ring-2 ring-blue-200/50"
          : "border-white/60 dark:border-neutral-700/60"
      }`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {isDragging && (
        <div className="absolute inset-0 flex items-center justify-center bg-blue-50/70 dark:bg-blue-900/30 rounded-2xl pointer-events-none text-blue-600 dark:text-blue-300 font-medium text-sm z-10">
          松开鼠标上传图片
        </div>
      )}
      {/* Input Area */}
      <div className="flex items-end gap-3">
        <div className="flex-1">
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            placeholder="输入消息，Shift+Enter 换行；可粘贴或拖拽图片"
            className="w-full resize-none bg-transparent border-0 outline-none text-gray-800 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 text-sm leading-relaxed min-h-[24px] max-h-[150px]"
            rows={1}
            disabled={isLoading}
          />
        </div>
      </div>

      {/* Attached Image Previews */}
      {attachedImages.length > 0 && (
        <div className="flex gap-2 mt-2 flex-wrap">
          {attachedImages.map((img, i) => (
            <div key={i} className="relative group">
              <img src={img.preview} alt="" className="w-16 h-16 object-cover rounded-lg border" />
              <button
                type="button"
                onClick={() => removeImage(i)}
                className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="mt-2 text-red-500 text-xs">
          {error}
        </div>
      )}

      {/* Bottom Actions */}
      <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100 dark:border-neutral-800">
        <div className="flex items-center gap-1">
          <TooltipProvider>
            {/* Web Search Toggle */}
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={() => setWebSearchEnabled(!webSearchEnabled)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    webSearchEnabled
                      ? "bg-neutral-800 text-white border border-neutral-700 dark:border-neutral-600"
                      : "bg-gray-100 text-gray-500 hover:bg-gray-200 dark:bg-neutral-800 dark:text-gray-400 dark:hover:bg-neutral-700"
                  }`}
                  disabled={isLoading}
                >
                  <Globe className="w-3.5 h-3.5" />
                  <span>Web search</span>
                </button>
              </TooltipTrigger>
              <TooltipContent>Toggle web search</TooltipContent>
            </Tooltip>

            {/* Deep Thinking Toggle (Qwen3 enable_thinking) */}
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={() => setThinkingEnabled(!thinkingEnabled)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    thinkingEnabled
                      ? "bg-violet-600 text-white border border-violet-500"
                      : "bg-gray-100 text-gray-500 hover:bg-gray-200 dark:bg-neutral-800 dark:text-gray-400 dark:hover:bg-neutral-700"
                  }`}
                  disabled={isLoading}
                >
                  <Brain className="w-3.5 h-3.5" />
                  <span>Deep Thinking</span>
                </button>
              </TooltipTrigger>
              <TooltipContent>Enable reasoning output for supported models (e.g. Qwen3)</TooltipContent>
            </Tooltip>

            {/* Image Generation Toggle */}
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={() => setImageGenEnabled(!imageGenEnabled)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    imageGenEnabled
                      ? "bg-neutral-800 text-white border border-neutral-700 dark:border-neutral-600"
                      : "bg-gray-100 text-gray-500 hover:bg-gray-200 dark:bg-neutral-800 dark:text-gray-400 dark:hover:bg-neutral-700"
                  }`}
                  disabled={isLoading}
                >
                  <ImagePlus className="w-3.5 h-3.5" />
                  <span>Image generations</span>
                </button>
              </TooltipTrigger>
              <TooltipContent>Toggle image generation</TooltipContent>
            </Tooltip>

            <div className="w-px h-5 bg-gray-200 mx-2" />

            {/* Action Icons */}
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={handleEnhance}
                  className={`p-2 rounded-lg transition-colors ${isEnhancing ? "bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400" : "hover:bg-gray-100 text-gray-400 hover:text-gray-600 dark:hover:bg-neutral-800 dark:text-gray-500 dark:hover:text-gray-300"}`}
                  disabled={isLoading || isEnhancing || !message.trim()}
                >
                  {isEnhancing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
                </button>
              </TooltipTrigger>
              <TooltipContent>AI 优化提示词</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={() => imageInputRef.current?.click()}
                  className={`p-2 rounded-lg transition-colors ${attachedImages.length > 0 ? "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400" : "hover:bg-gray-100 text-gray-400 hover:text-gray-600 dark:hover:bg-neutral-800 dark:text-gray-500 dark:hover:text-gray-300"}`}
                  disabled={isLoading}
                >
                  <Image className="w-4 h-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent>上传图片</TooltipContent>
            </Tooltip>
            <input
              ref={imageInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              multiple
              className="hidden"
              onChange={handleImageSelect}
            />

          </TooltipProvider>
        </div>

        <div className="flex items-center gap-1">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 dark:hover:bg-neutral-800 dark:text-gray-500 dark:hover:text-gray-300 transition-colors"
                  disabled={isLoading}
                >
                  <Copy className="w-4 h-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent>Copy</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={handleToggleFullscreen}
                  className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 dark:hover:bg-neutral-800 dark:text-gray-500 dark:hover:text-gray-300 transition-colors"
                  disabled={isLoading}
                >
                  {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                </button>
              </TooltipTrigger>
              <TooltipContent>{isFullscreen ? "Exit Fullscreen" : "Fullscreen"}</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                {isStreaming ? (
                  <button
                    type="button"
                    onClick={onStop}
                    className="p-2 rounded-lg bg-neutral-800 text-white hover:bg-red-600 transition-all"
                  >
                    <Square className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={(!message.trim() && attachedImages.length === 0) || isLoading}
                    className={`p-2 rounded-lg transition-all ${
                      (message.trim() || attachedImages.length > 0) && !isLoading
                        ? "bg-neutral-800 text-white hover:bg-neutral-900"
                        : "bg-gray-100 text-gray-300 cursor-not-allowed"
                    }`}
                  >
                    <Send className="w-4 h-4" />
                  </button>
                )}
              </TooltipTrigger>
              <TooltipContent>{isStreaming ? "Stop Generating" : "Send Message"}</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>
    </div>
  );
}
