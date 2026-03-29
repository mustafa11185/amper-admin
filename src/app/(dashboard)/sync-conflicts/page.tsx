"use client";
export const dynamic = 'force-dynamic'

import { useState, useEffect, useCallback } from "react";
import { RefreshCcw, Check, XIcon, Pencil, X } from "lucide-react";
import toast from "react-hot-toast";

/* ── types ────────────────────────────────────────────────────── */

interface Conflict {
  id: string;
  branch_id: string;
  device_id: string | null;
  action_type: string;
  payload: any;
  client_uuid: string;
  status: string;
  retries: number;
  error: string | null;
  created_at: string;
  branch?: { id: string; name: string; tenant_id: string };
}

/* ── skeleton ─────────────────────────────────────────────────── */

function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-lg ${className}`}
      style={{ background: "var(--bg-muted)" }}
    />
  );
}

/* ── main page ────────────────────────────────────────────────── */

export default function SyncConflictsPage() {
  const [conflicts, setConflicts] = useState<Conflict[]>([]);
  const [loading, setLoading] = useState(true);
  const [editConflict, setEditConflict] = useState<Conflict | null>(null);

  const fetchConflicts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/sync-conflicts");
      if (!res.ok) throw new Error();
      const data = await res.json();
      setConflicts(data.conflicts || []);
    } catch {
      toast.error("فشل في تحميل التعارضات");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConflicts();
  }, [fetchConflicts]);

  async function handleAction(id: string, action: "accept" | "reject", payload?: any) {
    try {
      const body: any = { id, action };
      if (payload !== undefined) {
        body.action = "edit";
        body.payload = payload;
      }
      const res = await fetch("/api/sync-conflicts", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error();
      toast.success(
        action === "accept" ? "تم قبول العملية" : "تم رفض العملية"
      );
      fetchConflicts();
    } catch {
      toast.error("فشل في تنفيذ الإجراء");
    }
  }

  function truncateJSON(obj: any, maxLen = 120): string {
    const str = JSON.stringify(obj, null, 0);
    if (str.length <= maxLen) return str;
    return str.slice(0, maxLen) + "...";
  }

  return (
    <div className="space-y-6">
      <section
        className="rounded-2xl p-6"
        style={{
          background: "var(--bg-surface)",
          boxShadow: "var(--shadow-md)",
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <RefreshCcw size={22} style={{ color: "var(--blue-primary)" }} />
            <h2
              className="text-lg font-bold"
              style={{ color: "var(--text-primary)" }}
            >
              تعارضات المزامنة
            </h2>
          </div>
          <button
            onClick={fetchConflicts}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors cursor-pointer"
            style={{
              background: "var(--blue-soft)",
              color: "var(--blue-primary)",
            }}
          >
            <RefreshCcw size={14} />
            تحديث
          </button>
        </div>

        {/* Content */}
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        ) : conflicts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <RefreshCcw
              size={48}
              style={{ color: "var(--text-muted)", opacity: 0.4 }}
            />
            <p
              className="text-lg font-medium mt-4"
              style={{ color: "var(--text-muted)" }}
            >
              لا توجد تعارضات
            </p>
            <p
              className="text-sm mt-1"
              style={{ color: "var(--text-muted)", opacity: 0.7 }}
            >
              جميع عمليات المزامنة تمت بنجاح
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border)" }}>
                  {["الجهاز", "نوع العملية", "التاريخ", "التفاصيل", "إجراءات"].map(
                    (h) => (
                      <th
                        key={h}
                        className="text-right py-3 px-3 font-medium"
                        style={{ color: "var(--text-muted)" }}
                      >
                        {h}
                      </th>
                    )
                  )}
                </tr>
              </thead>
              <tbody>
                {conflicts.map((c) => (
                  <tr
                    key={c.id}
                    className="transition-colors"
                    style={{ borderBottom: "1px solid var(--border)" }}
                  >
                    <td
                      className="py-3 px-3"
                      style={{
                        fontFamily: "var(--font-jetbrains-mono)",
                        color: "var(--text-secondary)",
                        fontSize: 12,
                      }}
                    >
                      {c.device_id || "غير محدد"}
                    </td>
                    <td className="py-3 px-3">
                      <span
                        className="inline-block px-2 py-0.5 rounded-md text-xs font-medium"
                        style={{
                          background: "var(--violet-soft)",
                          color: "var(--violet)",
                        }}
                      >
                        {c.action_type}
                      </span>
                    </td>
                    <td
                      className="py-3 px-3"
                      style={{
                        fontFamily: "var(--font-rajdhani)",
                        color: "var(--text-muted)",
                        fontSize: 13,
                      }}
                    >
                      {new Date(c.created_at).toLocaleString("ar-IQ")}
                    </td>
                    <td
                      className="py-3 px-3 max-w-xs"
                      title={JSON.stringify(c.payload, null, 2)}
                    >
                      <code
                        className="text-xs block truncate"
                        dir="ltr"
                        style={{
                          fontFamily: "var(--font-jetbrains-mono)",
                          color: "var(--text-muted)",
                          maxWidth: 240,
                        }}
                      >
                        {truncateJSON(c.payload)}
                      </code>
                    </td>
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleAction(c.id, "accept")}
                          className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer"
                          style={{
                            background: "rgba(5,150,105,0.08)",
                            color: "var(--success)",
                          }}
                        >
                          <Check size={13} />
                          قبول
                        </button>
                        <button
                          onClick={() => handleAction(c.id, "reject")}
                          className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer"
                          style={{
                            background: "rgba(220,38,38,0.08)",
                            color: "var(--danger)",
                          }}
                        >
                          <XIcon size={13} />
                          رفض
                        </button>
                        <button
                          onClick={() => setEditConflict(c)}
                          className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer"
                          style={{
                            background: "var(--blue-soft)",
                            color: "var(--blue-primary)",
                          }}
                        >
                          <Pencil size={13} />
                          تعديل
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Edit Modal */}
      {editConflict && (
        <EditConflictModal
          conflict={editConflict}
          onClose={() => setEditConflict(null)}
          onSave={async (payload) => {
            await handleAction(editConflict.id, "accept", payload);
            setEditConflict(null);
          }}
        />
      )}
    </div>
  );
}

/* ── Edit Conflict Modal ─────────────────────────────────────── */

function EditConflictModal({
  conflict,
  onClose,
  onSave,
}: {
  conflict: Conflict;
  onClose: () => void;
  onSave: (payload: any) => Promise<void>;
}) {
  const [jsonText, setJsonText] = useState(
    JSON.stringify(conflict.payload, null, 2)
  );
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    try {
      const parsed = JSON.parse(jsonText);
      setError("");
      setSaving(true);
      await onSave(parsed);
    } catch {
      setError("JSON غير صالح");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(15,23,42,0.5)" }}
    >
      <div
        className="w-full max-w-lg rounded-2xl p-6"
        style={{
          background: "var(--bg-surface)",
          boxShadow: "var(--shadow-lg)",
        }}
      >
        <div className="flex items-center justify-between mb-4">
          <h3
            className="text-lg font-bold"
            style={{ color: "var(--text-primary)" }}
          >
            تعديل البيانات
          </h3>
          <button
            onClick={onClose}
            className="p-1 rounded-lg transition-colors cursor-pointer"
            style={{ color: "var(--text-muted)" }}
          >
            <X size={20} />
          </button>
        </div>

        <div className="mb-3">
          <p className="text-xs mb-1" style={{ color: "var(--text-muted)" }}>
            نوع العملية: {conflict.action_type}
          </p>
        </div>

        <textarea
          value={jsonText}
          onChange={(e) => {
            setJsonText(e.target.value);
            setError("");
          }}
          dir="ltr"
          rows={14}
          className="w-full px-3 py-2 rounded-lg text-xs outline-none resize-y"
          style={{
            background: "var(--bg-elevated)",
            border: `1px solid ${error ? "var(--danger)" : "var(--border)"}`,
            color: "var(--text-primary)",
            fontFamily: "var(--font-jetbrains-mono)",
            lineHeight: 1.6,
          }}
        />
        {error && (
          <p className="text-xs mt-1" style={{ color: "var(--danger)" }}>
            {error}
          </p>
        )}

        <div className="flex items-center gap-3 mt-4">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 py-2.5 rounded-xl text-sm font-medium text-white transition-colors cursor-pointer disabled:opacity-50"
            style={{
              background: "var(--success)",
            }}
          >
            {saving ? "جاري الحفظ..." : "حفظ وقبول"}
          </button>
          <button
            onClick={onClose}
            className="px-6 py-2.5 rounded-xl text-sm font-medium transition-colors cursor-pointer"
            style={{
              background: "var(--bg-muted)",
              color: "var(--text-secondary)",
            }}
          >
            إلغاء
          </button>
        </div>
      </div>
    </div>
  );
}
