"use client";

import { useState } from "react";
import { Globe, ImagePlus, Wand2, Image, Paperclip, Send, Maximize2, Copy, Loader2 } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface ChatInputProps {
  onSendMessage: (params: {
    message: string;
    modelIds: string[];
    options: { webSearch: boolean; imageGen: boolean };
  }) => Promise<void> | void;
  modelIds: string[];
}

export function ChatInput({ onSendMessage, modelIds }: ChatInputProps) {
  const [message, setMessage] = useState("");
  const [webSearchEnabled, setWebSearchEnabled] = useState(false);
  const [imageGenEnabled, setImageGenEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!message.trim()) return;

    setIsLoading(true);
    setError(null);

    try {
      await onSendMessage({
        message: message.trim(),
        modelIds,
        options: {
          webSearch: webSearchEnabled,
          imageGen: imageGenEnabled,
        },
      });
      setMessage("");
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

  return (
    <div className="bg-white/90 backdrop-blur-md rounded-2xl shadow-lg border border-white/60 p-3">
      {/* Input Area */}
      <div className="flex items-end gap-3">
        <div className="flex-1">
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="输入消息，Shift+Enter 换行"
            className="w-full resize-none bg-transparent border-0 outline-none text-gray-800 placeholder-gray-400 text-sm leading-relaxed min-h-[24px] max-h-[150px]"
            rows={1}
            disabled={isLoading}
          />
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mt-2 text-red-500 text-xs">
          {error}
        </div>
      )}

      {/* Bottom Actions */}
      <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
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
                      ? "bg-neutral-800 text-white border border-neutral-700"
                      : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                  }`}
                  disabled={isLoading}
                >
                  <Globe className="w-3.5 h-3.5" />
                  <span>Web search</span>
                </button>
              </TooltipTrigger>
              <TooltipContent>Toggle web search</TooltipContent>
            </Tooltip>

            {/* Image Generation Toggle */}
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={() => setImageGenEnabled(!imageGenEnabled)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    imageGenEnabled
                      ? "bg-neutral-800 text-white border border-neutral-700"
                      : "bg-gray-100 text-gray-500 hover:bg-gray-200"
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
                  className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
                  disabled={isLoading}
                >
                  <Wand2 className="w-4 h-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent>AI Enhance</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
                  disabled={isLoading}
                >
                  <Image className="w-4 h-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent>Upload Image</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
                  disabled={isLoading}
                >
                  <Paperclip className="w-4 h-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent>Attach File</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        <div className="flex items-center gap-1">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
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
                  className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
                  disabled={isLoading}
                >
                  <Maximize2 className="w-4 h-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent>Fullscreen</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={!message.trim() || isLoading}
                  className={`p-2 rounded-lg transition-all ${
                    message.trim() && !isLoading
                      ? "bg-neutral-800 text-white hover:bg-neutral-900"
                      : "bg-gray-100 text-gray-300 cursor-not-allowed"
                  }`}
                >
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </button>
              </TooltipTrigger>
              <TooltipContent>Send Message</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>
    </div>
  );
}
