"use client";
export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { Megaphone, Send, Check } from "lucide-react";

type Tenant = {
  id: string;
  name: string;
};

export default function AnnouncementsPage() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [target, setTarget] = useState<"all" | "one">("all");
  const [tenantId, setTenantId] = useState("");
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<
    | { created: number; skipped: number; total_tenants: number }
    | null
  >(null);

  useEffect(() => {
    fetch("/api/clients?limit=500", { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => {
        const list = (data?.clients || data?.tenants || data?.items || []) as Array<{
          id: string;
          name: string;
        }>;
        setTenants(list);
      })
      .catch(() => setTenants([]));
  }, []);

  const send = async () => {
    if (!title.trim() || !message.trim()) {
      alert("العنوان والنص مطلوبان");
      return;
    }
    if (target === "one" && !tenantId) {
      alert("اختر العميل");
      return;
    }
    if (!confirm(`هل تريد إرسال هذا الإعلان إلى ${target === "all" ? "جميع العملاء" : "العميل المحدد"}؟`)) {
      return;
    }
    setSending(true);
    setResult(null);
    try {
      const res = await fetch("/api/announcements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, message, target, tenant_id: tenantId || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "فشل الإرسال");
      setResult(data);
      setTitle("");
      setMessage("");
    } catch (e) {
      alert("خطأ: " + (e as Error).message);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-6">
      <section
        className="rounded-2xl p-6"
        style={{ background: "var(--bg-surface)", boxShadow: "var(--shadow-md)" }}
      >
        <div className="flex items-center gap-2 mb-2">
          <Megaphone size={22} style={{ color: "var(--blue-primary)" }} />
          <h2 className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>
            إرسال إعلان
          </h2>
        </div>
        <p className="text-sm mb-6" style={{ color: "var(--text-muted)" }}>
          أرسل إعلاناً إلى جميع العملاء أو عميل واحد. سيظهر في تطبيق الموظف وبوابة الشريك كتنبيه.
        </p>

        <div className="space-y-4 max-w-2xl">
          <div>
            <label
              className="block text-xs font-bold mb-1"
              style={{ color: "var(--text-muted)" }}
            >
              الجهة المستهدفة
            </label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  checked={target === "all"}
                  onChange={() => setTarget("all")}
                />
                <span style={{ color: "var(--text-primary)" }}>جميع العملاء</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  checked={target === "one"}
                  onChange={() => setTarget("one")}
                />
                <span style={{ color: "var(--text-primary)" }}>عميل واحد</span>
              </label>
            </div>
          </div>

          {target === "one" && (
            <div>
              <label
                className="block text-xs font-bold mb-1"
                style={{ color: "var(--text-muted)" }}
              >
                العميل
              </label>
              <select
                value={tenantId}
                onChange={(e) => setTenantId(e.target.value)}
                className="w-full px-3 py-2 rounded-lg text-sm"
                style={{
                  background: "var(--bg-base)",
                  border: "1px solid var(--border)",
                  color: "var(--text-primary)",
                }}
              >
                <option value="">-- اختر عميلاً --</option>
                {tenants.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label
              className="block text-xs font-bold mb-1"
              style={{ color: "var(--text-muted)" }}
            >
              العنوان
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="مثال: صيانة مجدولة يوم الجمعة"
              className="w-full px-3 py-2 rounded-lg text-sm"
              style={{
                background: "var(--bg-base)",
                border: "1px solid var(--border)",
                color: "var(--text-primary)",
              }}
            />
          </div>

          <div>
            <label
              className="block text-xs font-bold mb-1"
              style={{ color: "var(--text-muted)" }}
            >
              نص الإعلان
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={5}
              placeholder="اكتب نص الإعلان هنا..."
              className="w-full px-3 py-2 rounded-lg text-sm"
              style={{
                background: "var(--bg-base)",
                border: "1px solid var(--border)",
                color: "var(--text-primary)",
                resize: "vertical",
              }}
            />
          </div>

          <div className="flex justify-end">
            <button
              onClick={send}
              disabled={sending}
              className="flex items-center gap-2 px-5 py-2 rounded-lg font-bold text-sm"
              style={{
                background: "linear-gradient(135deg, #1B4FD8, #7C3AED)",
                color: "white",
                opacity: sending ? 0.6 : 1,
                cursor: sending ? "not-allowed" : "pointer",
              }}
            >
              <Send size={16} />
              {sending ? "جاري الإرسال..." : "إرسال الإعلان"}
            </button>
          </div>

          {result && (
            <div
              className="rounded-lg p-4 flex items-center gap-3"
              style={{
                background: "rgba(16,185,129,0.1)",
                border: "1px solid rgba(16,185,129,0.3)",
              }}
            >
              <Check size={20} style={{ color: "#10B981" }} />
              <div className="text-sm" style={{ color: "var(--text-primary)" }}>
                تم إرسال الإعلان بنجاح — {result.created} عميل
                {result.skipped > 0 && ` (تخطي ${result.skipped})`}
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
