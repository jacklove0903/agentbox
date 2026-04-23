"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Sparkles } from "lucide-react";
import { useAuth } from "@/lib/auth";

type Mode = "login" | "register";

export function AuthForm({ mode }: { mode: Mode }) {
  const router = useRouter();
  const { login, register } = useAuth();

  const [identifier, setIdentifier] = useState(""); // login only
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      if (mode === "login") {
        await login(identifier.trim(), password);
      } else {
        await register(username.trim(), email.trim(), password);
      }
      router.replace("/");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "请求失败");
    } finally {
      setSubmitting(false);
    }
  };

  const title = mode === "login" ? "登录" : "注册";
  const footerText =
    mode === "login" ? "还没有账号？" : "已有账号？";
  const footerHref = mode === "login" ? "/register" : "/login";
  const footerLabel = mode === "login" ? "去注册" : "去登录";

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-sky-50 via-white to-fuchsia-50 px-4">
      <div className="w-full max-w-sm bg-white/90 backdrop-blur-sm rounded-2xl border border-gray-200 shadow-xl p-8">
        <div className="flex flex-col items-center mb-6">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-sky-500 via-indigo-500 to-fuchsia-500 flex items-center justify-center shadow">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <h1 className="mt-3 text-xl font-semibold tracking-tight text-gray-900">
            AgentBox {title}
          </h1>
          <p className="text-xs text-gray-400 mt-1">All-in-one chat</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          {mode === "login" ? (
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                用户名或邮箱
              </label>
              <input
                type="text"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400"
                required
                autoFocus
              />
            </div>
          ) : (
            <>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  用户名
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400"
                  minLength={3}
                  maxLength={32}
                  pattern="[A-Za-z0-9_]+"
                  title="3-32 位字母、数字或下划线"
                  required
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  邮箱
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400"
                  required
                />
              </div>
            </>
          )}

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              密码
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400"
              minLength={6}
              required
            />
          </div>

          {error && (
            <div className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-md px-3 py-2">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-neutral-900 hover:bg-neutral-800 text-white text-sm font-medium py-2.5 rounded-lg transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {submitting ? "请稍候…" : title}
          </button>
        </form>

        <p className="mt-5 text-xs text-center text-gray-500">
          {footerText}{" "}
          <Link href={footerHref} className="text-indigo-600 hover:underline">
            {footerLabel}
          </Link>
        </p>
      </div>
    </div>
  );
}
