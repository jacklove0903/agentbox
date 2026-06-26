"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { apiFetch, readApiErrorMessage } from "@/lib/api";
import { Plus, Trash2, ChevronDown, Eye } from "lucide-react";

interface ModelInfo {
  id: string;
  name: string;
  icon: string;
  provider?: string;
  modelName?: string;
  supportsVision?: boolean;
  sortOrder?: number;
  enabled?: boolean;
}

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onModelsChanged?: () => void;
}

/** Minimalist input with no border — underline style on focus. */
function Field({
  value,
  onChange,
  placeholder,
  className = "",
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  className?: string;
}) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={`w-full bg-transparent py-2 text-sm text-gray-800 dark:text-gray-200 placeholder:text-gray-300 dark:placeholder:text-gray-600 outline-none border-b border-gray-100 dark:border-neutral-800 focus:border-gray-300 dark:focus:border-neutral-600 transition-colors ${className}`}
    />
  );
}

export function SettingsDialog({ open, onOpenChange, onModelsChanged }: SettingsDialogProps) {
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [newId, setNewId] = useState("");
  const [newName, setNewName] = useState("");
  const [newProvider, setNewProvider] = useState("openrouter");
  const [newApiName, setNewApiName] = useState("");
  const [newIcon, setNewIcon] = useState("");
  const [newVision, setNewVision] = useState(false);

  const fetchModels = useCallback(async () => {
    try {
      const res = await apiFetch("/api/models/getmodels");
      if (res.ok) setModels(await res.json());
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    if (open) {
      fetchModels();
      setShowForm(false);
      setError("");
    }
  }, [open, fetchModels]);

  const resetForm = () => {
    setNewId("");
    setNewName("");
    setNewApiName("");
    setNewIcon("");
    setNewVision(false);
    setError("");
  };

  const handleCreate = useCallback(async () => {
    if (busy) return;
    setError("");
    setBusy(true);
    try {
      const res = await apiFetch("/api/models", {
        method: "POST",
        body: JSON.stringify({
          id: newId.trim(),
          name: newName.trim(),
          provider: newProvider.trim(),
          modelName: newApiName.trim(),
          icon: newIcon.trim(),
          supportsVision: newVision,
        }),
      });
      if (!res.ok) {
        setError(await readApiErrorMessage(res, "新增失败"));
        return;
      }
      resetForm();
      setShowForm(false);
      await fetchModels();
      onModelsChanged?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : "新增失败");
    } finally {
      setBusy(false);
    }
  }, [busy, newId, newName, newProvider, newApiName, newIcon, newVision, fetchModels, onModelsChanged]);

  const handleDelete = useCallback(
    async (id: string) => {
      if (busy) return;
      setDeletingId(id);
      setError("");
      setBusy(true);
      try {
        const res = await apiFetch(`/api/models/${encodeURIComponent(id)}`, {
          method: "DELETE",
        });
        if (!res.ok) {
          setError(await readApiErrorMessage(res, "删除失败"));
          return;
        }
        await fetchModels();
        onModelsChanged?.();
      } catch (e) {
        setError(e instanceof Error ? e.message : "删除失败");
      } finally {
        setBusy(false);
        setDeletingId(null);
      }
    },
    [busy, fetchModels, onModelsChanged]
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm px-0 pt-6 pb-0 gap-0 rounded-2xl border-0 shadow-2xl shadow-black/10 dark:shadow-black/40">
        {/* Header */}
        <DialogHeader className="px-6 mb-1">
          <DialogTitle className="text-base font-medium tracking-tight text-gray-900 dark:text-gray-100">
            设置
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[70vh]">
          <div className="px-6 pb-6 space-y-6">
            {/* ── Model list ── */}
            <section>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                  模型
                </span>
                <button
                  type="button"
                  onClick={() => setShowForm((v) => !v)}
                  className="inline-flex items-center gap-1 text-[11px] text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  添加
                </button>
              </div>

              {/* Expandable add form */}
              {showForm && (
                <div className="mb-4 p-4 rounded-xl bg-gray-50/80 dark:bg-neutral-800/40 space-y-3 animate-in fade-in slide-in-from-top-1 duration-200">
                  <div className="grid grid-cols-2 gap-3">
                    <Field value={newId} onChange={setNewId} placeholder="模型 ID" className="col-span-2" />
                    <Field value={newName} onChange={setNewName} placeholder="显示名称" className="col-span-2" />
                    <Field value={newProvider} onChange={setNewProvider} placeholder="Provider" />
                    <Field value={newApiName} onChange={setNewApiName} placeholder="API 名称" />
                  </div>
                  <Field value={newIcon} onChange={setNewIcon} placeholder="图标 URL（可选）" />

                  {/* Vision toggle */}
                  <label className="inline-flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 cursor-pointer select-none">
                    <span
                      role="checkbox"
                      aria-checked={newVision}
                      tabIndex={0}
                      onClick={() => setNewVision((v) => !v)}
                      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setNewVision((v) => !v); } }}
                      className={`relative w-8 h-4.5 rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-300 ${
                        newVision ? "bg-gray-700 dark:bg-gray-300" : "bg-gray-200 dark:bg-neutral-700"
                      }`}
                    >
                      <span
                        className={`absolute top-0.5 left-0.5 w-3.5 h-3.5 rounded-full bg-white shadow-sm transition-transform ${
                          newVision ? "translate-x-3.5" : ""
                        }`}
                      />
                    </span>
                    <Eye className="w-3 h-3" />
                    视觉识别
                  </label>

                  {error && (
                    <p className="text-[11px] text-red-500/80">{error}</p>
                  )}

                  <button
                    type="button"
                    onClick={handleCreate}
                    disabled={busy}
                    className="w-full py-2 text-xs font-medium rounded-lg bg-gray-900 dark:bg-white text-white dark:text-gray-900 hover:bg-gray-800 dark:hover:bg-gray-100 disabled:opacity-30 transition-all"
                  >
                    {busy ? "添加中…" : "确认添加"}
                  </button>
                </div>
              )}

              {/* Model cards */}
              {models.length === 0 ? (
                <p className="text-xs text-gray-300 dark:text-gray-600 py-4 text-center">
                  暂无模型
                </p>
              ) : (
                <div className="space-y-0.5">
                  {models.map((m) => (
                    <div
                      key={m.id}
                      className="group flex items-center gap-3 px-2 py-2 -mx-2 rounded-lg hover:bg-gray-50 dark:hover:bg-neutral-800/40 transition-colors"
                    >
                      <img
                        src={m.icon}
                        alt={m.name}
                        className="w-7 h-7 rounded-lg flex-shrink-0 bg-gray-100 dark:bg-neutral-800"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-800 dark:text-gray-200 truncate leading-tight">
                          {m.name}
                        </p>
                        <p className="text-[11px] text-gray-400 dark:text-gray-500 truncate leading-tight mt-0.5">
                          {m.id}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDelete(m.id)}
                        disabled={busy}
                        className="p-1.5 rounded-md text-gray-300 dark:text-gray-600 hover:text-red-400 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-all duration-150"
                        title="删除"
                      >
                        {deletingId === m.id ? (
                          <span className="block w-3.5 h-3.5 rounded-full border-2 border-gray-300 border-t-gray-600 animate-spin" />
                        ) : (
                          <Trash2 className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

