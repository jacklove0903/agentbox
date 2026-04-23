"use client";

import { useState, useEffect, useCallback } from "react";
import { Loader2, Download, Trash2 } from "lucide-react";
import { apiFetch } from "@/lib/api";

interface ImageRecord {
  id: number;
  prompt: string;
  model: string;
  size: string;
  imageUrl: string;
  createdAt: string;
}

const MODELS = [
  { value: "Kwai-Kolors/Kolors", label: "Kolors（快意）" },
  { value: "Qwen/Qwen-Image", label: "Qwen Image（通义）" },
];

const SIZES: Record<string, { value: string; label: string }[]> = {
  "Kwai-Kolors/Kolors": [
    { value: "1024x1024", label: "1024×1024（1:1）" },
    { value: "960x1280", label: "960×1280（3:4）" },
    { value: "768x1024", label: "768×1024（3:4）" },
    { value: "720x1280", label: "720×1280（9:16）" },
  ],
  "Qwen/Qwen-Image": [
    { value: "1328x1328", label: "1328×1328（1:1）" },
    { value: "1664x928", label: "1664×928（16:9）" },
    { value: "928x1664", label: "928×1664（9:16）" },
    { value: "1472x1140", label: "1472×1140（4:3）" },
    { value: "1140x1472", label: "1140×1472（3:4）" },
  ],
};

export function ImageGeneratorPanel() {
  const [prompt, setPrompt] = useState("");
  const [model, setModel] = useState(MODELS[0].value);
  const [size, setSize] = useState(SIZES[MODELS[0].value][0].value);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState("");
  const [history, setHistory] = useState<ImageRecord[]>([]);
  const [selectedImage, setSelectedImage] = useState<ImageRecord | null>(null);

  // Load history on mount
  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    try {
      const res = await apiFetch("/api/tools/image-gen/history?limit=20");
      if (res.ok) {
        const data = await res.json();
        setHistory(data);
      }
    } catch {
      // silently ignore
    }
  };

  const handleGenerate = async () => {
    if (!prompt.trim() || isGenerating) return;
    setIsGenerating(true);
    setError("");

    try {
      const res = await apiFetch("/api/tools/image-gen", {
        method: "POST",
        body: JSON.stringify({ prompt: prompt.trim(), model, size }),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        setError(data.error || `请求失败: ${res.status}`);
        return;
      }

      const newRecord: ImageRecord = data;
      setHistory((prev) => [newRecord, ...prev]);
      setSelectedImage(newRecord);
    } catch (e) {
      setError(`生成失败: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = (record: ImageRecord) => {
    const a = document.createElement("a");
    a.href = record.imageUrl;
    a.target = "_blank";
    a.download = `agentbox-${record.id}.png`;
    a.click();
  };

  const [brokenUrls, setBrokenUrls] = useState<Set<number>>(new Set());
  const handleImgError = useCallback((id: number) => {
    setBrokenUrls((prev) => new Set(prev).add(id));
  }, []);

  const displayImage = selectedImage || (history.length > 0 ? history[0] : null);

  return (
    <div className="h-full flex flex-col p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Image Generator</h1>
        <p className="text-sm text-gray-500 mt-1">
          输入描述，AI 为你生成图片
        </p>
      </div>

      <div className="flex-1 min-h-0 flex gap-6">
        {/* Left: Controls + Display */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Prompt Input */}
          <div className="mb-4">
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="描述你想要生成的图片，例如：A futuristic city at sunset, cyberpunk style..."
              className="w-full h-24 p-4 rounded-xl border border-gray-200 bg-white text-sm text-gray-800 placeholder-gray-400 resize-none focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 transition-all"
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                  e.preventDefault();
                  handleGenerate();
                }
              }}
            />
          </div>

          {/* Options Row */}
          <div className="flex items-center gap-3 mb-4">
            <select
              value={model}
              onChange={(e) => {
                const newModel = e.target.value;
                setModel(newModel);
                setSize(SIZES[newModel][0].value);
              }}
              className="flex-1 px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-200 transition-all"
            >
              {MODELS.map((m) => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>

            <select
              value={size}
              onChange={(e) => setSize(e.target.value)}
              className="px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-200 transition-all"
            >
              {(SIZES[model] || []).map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>

            <button
              type="button"
              onClick={handleGenerate}
              disabled={!prompt.trim() || isGenerating}
              className="px-5 py-2 rounded-lg bg-neutral-800 text-white text-sm font-medium hover:bg-neutral-900 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 flex-shrink-0"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  生成中...
                </>
              ) : (
                "生成图片"
              )}
            </button>
          </div>

          {/* Image Display */}
          <div className="flex-1 min-h-0 rounded-2xl border border-gray-200 bg-white overflow-hidden flex items-center justify-center">
            {error ? (
              <div className="p-6">
                <p className="text-sm text-red-500">{error}</p>
              </div>
            ) : isGenerating ? (
              <div className="flex flex-col items-center gap-3 text-gray-400">
                <Loader2 className="w-10 h-10 animate-spin" />
                <p className="text-sm font-medium">正在生成图片，请稍候...</p>
                <p className="text-xs text-gray-400">通常需要 10-30 秒</p>
              </div>
            ) : displayImage ? (
              brokenUrls.has(displayImage.id) ? (
                <div className="flex flex-col items-center gap-2 text-gray-400">
                  <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center">
                    <span className="text-2xl">🖼️</span>
                  </div>
                  <p className="text-sm font-medium text-gray-500">图片已过期</p>
                  <p className="text-xs text-gray-400">图片 URL 有效期为 1 小时，请重新生成</p>
                </div>
              ) : (
                <div className="relative w-full h-full group">
                  <img
                    src={displayImage.imageUrl}
                    alt={displayImage.prompt}
                    className="w-full h-full object-contain"
                    onError={() => handleImgError(displayImage.id)}
                  />
                  {/* Overlay actions */}
                  <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-white/80 truncate flex-1 mr-2">{displayImage.prompt}</p>
                      <button
                        type="button"
                        onClick={() => handleDownload(displayImage)}
                        className="p-1.5 rounded-md bg-white/20 hover:bg-white/30 text-white transition-colors flex-shrink-0"
                        title="下载图片"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              )
            ) : (
              <div className="text-center text-gray-400">
                <div className="w-16 h-16 mx-auto mb-3 rounded-2xl bg-gray-100 flex items-center justify-center">
                  <span className="text-2xl">🎨</span>
                </div>
                <p className="text-sm font-medium text-gray-500">输入描述开始生成</p>
                <p className="text-xs text-gray-400 mt-1">Ctrl + Enter 快速生成</p>
              </div>
            )}
          </div>
        </div>

        {/* Right: History */}
        <div className="w-48 flex-shrink-0 flex flex-col">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
            历史记录
          </h3>
          <div className="flex-1 min-h-0 overflow-y-auto space-y-2">
            {history.length === 0 ? (
              <p className="text-xs text-gray-400 text-center mt-8">暂无记录</p>
            ) : (
              history.map((record) => (
                <button
                  type="button"
                  key={record.id}
                  onClick={() => setSelectedImage(record)}
                  className={`w-full rounded-lg overflow-hidden border-2 transition-all ${
                    selectedImage?.id === record.id
                      ? "border-blue-400 shadow-sm"
                      : "border-transparent hover:border-gray-300"
                  }`}
                >
                  {brokenUrls.has(record.id) ? (
                    <div className="w-full aspect-square bg-gray-100 flex items-center justify-center">
                      <span className="text-xs text-gray-400">已过期</span>
                    </div>
                  ) : (
                    <img
                      src={record.imageUrl}
                      alt={record.prompt}
                      className="w-full aspect-square object-cover"
                      onError={() => handleImgError(record.id)}
                    />
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
