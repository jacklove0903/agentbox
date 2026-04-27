"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { ArrowRightLeft, Copy, Check, Loader2 } from "lucide-react";
import { apiFetch, readApiErrorMessage } from "@/lib/api";

const DEBOUNCE_MS = 500;

const LANGUAGES = [
  { code: "auto", label: "自动检测" },
  { code: "zh", label: "中文" },
  { code: "en", label: "English" },
  { code: "ja", label: "日本語" },
  { code: "ko", label: "한국어" },
  { code: "fr", label: "Français" },
  { code: "de", label: "Deutsch" },
  { code: "es", label: "Español" },
  { code: "ru", label: "Русский" },
  { code: "pt", label: "Português" },
  { code: "ar", label: "العربية" },
];

// Fallback model id if the /api/models/getmodels lookup fails for any reason.
const FALLBACK_MODEL_ID = "qwen2.5-7b";

export function TranslatorPanel() {
  const [sourceLang, setSourceLang] = useState("auto");
  const [targetLang, setTargetLang] = useState("en");
  const [sourceText, setSourceText] = useState("");
  const [targetText, setTargetText] = useState("");
  const [isTranslating, setIsTranslating] = useState(false);
  const [copied, setCopied] = useState(false);
  // Model used for translation. Resolved on mount from /api/models/getmodels
  // (which returns enabled models sorted by sort_order ASC, so [0] === sort_order=1).
  const [translatorModelId, setTranslatorModelId] = useState<string>(FALLBACK_MODEL_ID);
  const abortRef = useRef<AbortController | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await apiFetch("/api/models/getmodels");
        if (!res.ok) return;
        const models = (await res.json()) as Array<{ id: string }>;
        if (!cancelled && models.length > 0 && models[0]?.id) {
          setTranslatorModelId(models[0].id);
        }
      } catch {
        // keep fallback
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleSwapLanguages = () => {
    if (sourceLang === "auto") return;
    setSourceLang(targetLang);
    setTargetLang(sourceLang);
    setSourceText(targetText);
    setTargetText(sourceText);
  };

  const doTranslate = useCallback(async (text: string, srcLang: string, tgtLang: string) => {
    if (!text.trim()) {
      setTargetText("");
      return;
    }

    // Cancel previous in-flight request
    if (abortRef.current) abortRef.current.abort();

    const controller = new AbortController();
    abortRef.current = controller;
    setIsTranslating(true);
    setTargetText("");

    const sourceName = LANGUAGES.find((l) => l.code === srcLang)?.label ?? srcLang;
    const targetName = LANGUAGES.find((l) => l.code === tgtLang)?.label ?? tgtLang;

    const prompt =
      srcLang === "auto"
        ? `请将以下内容翻译为${targetName}，只输出翻译结果，不要添加任何解释、引号或额外文字：\n\n${text}`
        : `请将以下${sourceName}内容翻译为${targetName}，只输出翻译结果，不要添加任何解释、引号或额外文字：\n\n${text}`;

    try {
      const res = await apiFetch("/api/chat/stream", {
        method: "POST",
        body: JSON.stringify({
          message: prompt,
          modelIds: [translatorModelId],
          // Translation should be direct — disable web search and thinking so we
          // don't capture reasoning traces as the translation output.
          options: { webSearch: false, imageGen: false, enableThinking: false },
          // Don't persist translator chats to the sidebar conversation list.
          ephemeral: true,
        }),
        signal: controller.signal,
      });

      if (!res.ok) throw new Error(await readApiErrorMessage(res, "翻译失败"));
      const reader = res.body?.getReader();
      if (!reader) throw new Error("No response body");

      const decoder = new TextDecoder();
      let sseBuffer = "";
      let accumulated = "";

      while (true) {
        let readResult: ReadableStreamReadResult<Uint8Array>;
        try {
          readResult = await reader.read();
        } catch {
          if (accumulated) break;
          throw new Error("network error");
        }
        if (readResult.done) break;

        sseBuffer += decoder.decode(readResult.value, { stream: true });
        const parts = sseBuffer.split("\n\n");
        sseBuffer = parts.pop() || "";

        for (const part of parts) {
          const dataLine = part.split("\n").find((l) => l.startsWith("data:"));
          if (!dataLine) continue;

          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          let parsed: any;
          try {
            parsed = JSON.parse(dataLine.slice(5));
          } catch {
            continue;
          }

          // Skip non-content SSE frames (conversation meta, smart-title, reasoning, searching, …)
          // to avoid accidentally appending "undefined" or thinking traces to the translation.
          if (parsed.type && parsed.type !== "content") continue;
          if (parsed.searching) continue;
          if (parsed.error) {
            setTargetText(`翻译出错: ${parsed.error}`);
            break;
          }
          if (parsed.done) break;
          if (typeof parsed.content !== "string" || parsed.content.length === 0) continue;

          accumulated += parsed.content;
          setTargetText(accumulated);
        }
      }
    } catch (e) {
      if ((e as Error).name === "AbortError") return;
      setTargetText(`翻译失败: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setIsTranslating(false);
      abortRef.current = null;
    }
  }, [translatorModelId]);

  // Auto-translate with debounce when sourceText, sourceLang or targetLang changes
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (!sourceText.trim()) {
      setTargetText("");
      return;
    }

    debounceRef.current = setTimeout(() => {
      doTranslate(sourceText, sourceLang, targetLang);
    }, DEBOUNCE_MS);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [sourceText, sourceLang, targetLang, doTranslate]);

  const handleCopy = async () => {
    if (!targetText) return;
    await navigator.clipboard.writeText(targetText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="h-full flex flex-col p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">AI Translator</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          输入即翻译，基于大语言模型的实时智能翻译
        </p>
      </div>

      {/* Language Selector Bar */}
      <div className="flex items-center gap-3 mb-4">
        <select
          value={sourceLang}
          onChange={(e) => setSourceLang(e.target.value)}
          className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-sm font-medium text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-900/50 focus:border-blue-400 transition-all"
        >
          {LANGUAGES.map((lang) => (
            <option key={lang.code} value={lang.code}>
              {lang.label}
            </option>
          ))}
        </select>

        <button
          type="button"
          onClick={handleSwapLanguages}
          disabled={sourceLang === "auto"}
          className="p-2.5 rounded-xl border border-gray-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 hover:bg-gray-50 dark:hover:bg-neutral-700 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
          title="交换语言"
        >
          <ArrowRightLeft className="w-4 h-4" />
        </button>

        <select
          value={targetLang}
          onChange={(e) => setTargetLang(e.target.value)}
          className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-sm font-medium text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-900/50 focus:border-blue-400 transition-all"
        >
          {LANGUAGES.filter((l) => l.code !== "auto").map((lang) => (
            <option key={lang.code} value={lang.code}>
              {lang.label}
            </option>
          ))}
        </select>
      </div>

      {/* Translation Panels */}
      <div className="flex-1 min-h-0 grid grid-cols-2 gap-4">
        {/* Source */}
        <div className="flex flex-col rounded-2xl border border-gray-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 overflow-hidden">
          <textarea
            value={sourceText}
            onChange={(e) => setSourceText(e.target.value)}
            placeholder="输入文本，自动翻译..."
            className="flex-1 p-4 resize-none bg-transparent text-sm text-gray-800 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none leading-relaxed"
          />
          <div className="flex items-center justify-between px-4 py-2.5 border-t border-gray-100 dark:border-neutral-700">
            <span className="text-xs text-gray-400 dark:text-gray-500">
              {sourceText.length} 字符
            </span>
            {isTranslating && (
              <div className="flex items-center gap-1.5 text-blue-500">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span className="text-xs font-medium">翻译中...</span>
              </div>
            )}
          </div>
        </div>

        {/* Target */}
        <div className="flex flex-col rounded-2xl border border-gray-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 overflow-hidden">
          <div className="flex-1 p-4 overflow-y-auto">
            {targetText ? (
              <p className="text-sm text-gray-800 dark:text-gray-200 leading-relaxed whitespace-pre-wrap">
                {targetText}
              </p>
            ) : (
              <p className="text-sm text-gray-400 dark:text-gray-500">
                {sourceText.trim() ? "正在等待输入完成..." : "翻译结果将显示在这里..."}
              </p>
            )}
          </div>
          <div className="flex items-center justify-end px-4 py-2.5 border-t border-gray-100 dark:border-neutral-700">
            <button
              type="button"
              onClick={handleCopy}
              disabled={!targetText || isTranslating}
              className="p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-neutral-700 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              title="复制结果"
            >
              {copied ? (
                <Check className="w-4 h-4 text-green-500" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
