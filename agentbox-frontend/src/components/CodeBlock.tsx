"use client";

import { useState, useCallback } from "react";
import { Check, Copy } from "lucide-react";

export function CodeBlock({
  children,
  className,
  ...props
}: React.HTMLAttributes<HTMLElement> & { children?: React.ReactNode }) {
  const [copied, setCopied] = useState(false);

  // Detect if this is an inline code or a fenced code block
  const isBlock = className?.startsWith("language-") || false;
  const lang = className?.replace("language-", "") || "";

  const handleCopy = useCallback(() => {
    const text = String(children).replace(/\n$/, "");
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [children]);

  if (!isBlock) {
    return (
      <code className={className} {...props}>
        {children}
      </code>
    );
  }

  return (
    <div className="relative group">
      {lang && (
        <div className="absolute top-0 left-0 px-2.5 py-1 text-[10px] text-gray-400 uppercase tracking-wide select-none">
          {lang}
        </div>
      )}
      <button
        type="button"
        onClick={handleCopy}
        className="absolute top-1.5 right-1.5 p-1 rounded-md bg-gray-700 hover:bg-gray-600 text-gray-300 hover:text-white opacity-0 group-hover:opacity-100 transition-all z-10"
        title="复制代码"
      >
        {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
      </button>
      <code className={`${className || ""} ${lang ? "!pt-6 block" : ""}`} {...props}>
        {children}
      </code>
    </div>
  );
}
