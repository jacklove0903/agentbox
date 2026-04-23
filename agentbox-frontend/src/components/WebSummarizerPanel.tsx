"use client";

import { useState, useRef } from "react";
import { Globe, Loader2, Copy, Check, RotateCcw } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { CodeBlock } from "@/components/CodeBlock";
import { apiFetch } from "@/lib/api";

export function WebSummarizerPanel() {
  const [url, setUrl] = useState("");
  const [status, setStatus] = useState("");
  const [summary, setSummary] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const handleSummarize = async () => {
    const trimmed = url.trim();
    if (!trimmed) return;

    // Cancel previous
    if (abortRef.current) abortRef.current.abort();

    const controller = new AbortController();
    abortRef.current = controller;
    setIsLoading(true);
    setSummary("");
    setError("");
    setStatus("正在连接...");

    try {
      const res = await apiFetch("/api/tools/summarize", {
        method: "POST",
        body: JSON.stringify({ url: trimmed }),
        signal: controller.signal,
      });

      if (!res.ok) throw new Error(`请求失败: ${res.status}`);
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

          let chunk: { type: string; content: string; done: boolean; error?: string };
          try {
            chunk = JSON.parse(dataLine.slice(5));
          } catch {
            continue;
          }

          if (chunk.error) {
            setError(chunk.error);
            setStatus("");
            break;
          }

          if (chunk.type === "status") {
            setStatus(chunk.content);
          } else if (chunk.type === "content") {
            accumulated += chunk.content;
            setSummary(accumulated);
            setStatus("");
          } else if (chunk.type === "done") {
            setStatus("");
            break;
          }
        }
      }
    } catch (e) {
      if ((e as Error).name === "AbortError") return;
      setError(`请求失败: ${e instanceof Error ? e.message : String(e)}`);
      setStatus("");
    } finally {
      setIsLoading(false);
      abortRef.current = null;
    }
  };

  const handleCopy = async () => {
    if (!summary) return;
    await navigator.clipboard.writeText(summary);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleClear = () => {
    if (abortRef.current) abortRef.current.abort();
    setUrl("");
    setSummary("");
    setError("");
    setStatus("");
    setIsLoading(false);
  };

  return (
    <div className="h-full flex flex-col p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Web Summarizer</h1>
        <p className="text-sm text-gray-500 mt-1">
          输入网页链接，AI 自动提取并生成结构化摘要
        </p>
      </div>

      {/* URL Input */}
      <div className="flex gap-3 mb-6">
        <div className="flex-1 flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 bg-white focus-within:ring-2 focus-within:ring-blue-200 focus-within:border-blue-400 transition-all">
          <Globe className="w-4 h-4 text-gray-400 flex-shrink-0" />
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleSummarize();
              }
            }}
            placeholder="输入网页 URL，如 https://example.com/article"
            className="flex-1 bg-transparent text-sm text-gray-800 placeholder-gray-400 focus:outline-none"
          />
        </div>
        <button
          type="button"
          onClick={handleSummarize}
          disabled={!url.trim() || isLoading}
          className="px-5 py-2.5 rounded-xl bg-neutral-800 text-white text-sm font-medium hover:bg-neutral-900 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              处理中
            </>
          ) : (
            "总结"
          )}
        </button>
      </div>

      {/* Result Area */}
      <div className="flex-1 min-h-0 flex flex-col rounded-2xl border border-gray-200 bg-white overflow-hidden">
        <div className="flex-1 min-h-0 overflow-y-auto p-5">
          {error ? (
            <div className="flex items-start gap-3 p-4 rounded-xl bg-red-50 border border-red-200">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          ) : summary ? (
            <div className="prose prose-sm prose-gray max-w-none text-sm leading-relaxed [&>*:first-child]:mt-0 [&>*:last-child]:mb-0 [&_pre]:bg-gray-800 [&_pre]:text-gray-100 [&_pre]:rounded-lg [&_pre]:p-3 [&_pre]:text-xs [&_h1]:text-lg [&_h2]:text-base [&_h3]:text-sm [&_p]:my-2 [&_ul]:my-2 [&_ol]:my-2 [&_li]:my-0.5 [&_strong]:text-gray-900">
              <ReactMarkdown remarkPlugins={[remarkGfm]} components={{ code: CodeBlock }}>{summary}</ReactMarkdown>
            </div>
          ) : status ? (
            <div className="h-full flex items-center justify-center">
              <div className="flex items-center gap-2 text-blue-500">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span className="text-sm font-medium">{status}</span>
              </div>
            </div>
          ) : (
            <div className="h-full flex items-center justify-center">
              <div className="text-center text-gray-400">
                <Globe className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="text-sm font-medium text-gray-500">粘贴网页链接开始总结</p>
                <p className="text-xs text-gray-400 mt-1">支持新闻、博客、文档等网页内容</p>
              </div>
            </div>
          )}
        </div>

        {/* Footer actions */}
        {(summary || error) && (
          <div className="flex items-center justify-between px-4 py-2.5 border-t border-gray-100">
            <button
              type="button"
              onClick={handleClear}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              清除
            </button>
            <button
              type="button"
              onClick={handleCopy}
              disabled={!summary}
              className="p-1.5 rounded-md hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              title="复制摘要"
            >
              {copied ? (
                <Check className="w-4 h-4 text-green-500" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
