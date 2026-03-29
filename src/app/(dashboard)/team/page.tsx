"use client";
export const dynamic = 'force-dynamic'

import { useState, useEffect, useCallback } from "react";
import { UserCog, Plus, X, ShieldCheck, ShieldOff, KeyRound } from "lucide-react";
import toast from "react-hot-toast";

/* ── types ────────────────────────────────────────────────────── */

interface TeamMember {
  id: string;
  email: string;
  name: string;
  role: string;
  is_active: boolean;
  created_at: string;
}

const ROLE_LABELS: Record<string, string> = {
  super_admin: "مدير عام",
  sales: "مبيعات",
  support: "دعم فني",
  accountant: "محاسب",
};

const ROLES = ["super_admin", "sales", "support", "accountant"] as const;

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

export default function TeamPage() {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  const fetchTeam = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/team");
      if (!res.ok) throw new Error();
      const data = await res.json();
      setMembers(data.members || []);
    } catch {
      toast.error("فشل في تحميل بيانات الفريق");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTeam();
  }, [fetchTeam]);

  async function toggleActive(member: TeamMember) {
    try {
      const res = await fetch(`/api/team/${member.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: !member.is_active }),
      });
      if (!res.ok) throw new Error();
      toast.success(
        member.is_active ? "تم تعطيل الحساب" : "تم تفعيل الحساب"
      );
      fetchTeam();
    } catch {
      toast.error("فشل في تحديث الحالة");
    }
  }

  async function resetPassword(member: TeamMember) {
    const newPassword = prompt("أدخل كلمة المرور الجديدة:");
    if (!newPassword) return;
    if (newPassword.length < 6) {
      toast.error("كلمة المرور يجب أن تكون 6 أحرف على الأقل");
      return;
    }

    try {
      const res = await fetch(`/api/team/${member.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: newPassword }),
      });
      if (!res.ok) throw new Error();
      toast.success("تم إعادة تعيين كلمة المرور");
    } catch {
      toast.error("فشل في إعادة تعيين كلمة المرور");
    }
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
            <UserCog size={22} style={{ color: "var(--blue-primary)" }} />
            <h2
              className="text-lg font-bold"
              style={{ color: "var(--text-primary)" }}
            >
              فريق العمل
            </h2>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium text-white transition-colors cursor-pointer"
            style={{
              background:
                "linear-gradient(135deg, var(--blue-primary), var(--violet))",
            }}
          >
            <Plus size={16} />
            موظف جديد
          </button>
        </div>

        {/* Table */}
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-14 w-full" />
            ))}
          </div>
        ) : members.length === 0 ? (
          <p
            className="text-sm py-12 text-center"
            style={{ color: "var(--text-muted)" }}
          >
            لا يوجد أعضاء في الفريق
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border)" }}>
                  {["الاسم", "البريد", "الدور", "الحالة", "تاريخ الانضمام", "إجراءات"].map(
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
                {members.map((m) => (
                  <tr
                    key={m.id}
                    className="transition-colors"
                    style={{ borderBottom: "1px solid var(--border)" }}
                  >
                    <td
                      className="py-3 px-3 font-medium"
                      style={{ color: "var(--text-primary)" }}
                    >
                      {m.name}
                    </td>
                    <td
                      className="py-3 px-3"
                      style={{
                        fontFamily: "var(--font-jetbrains-mono)",
                        color: "var(--text-secondary)",
                        fontSize: 13,
                      }}
                    >
                      {m.email}
                    </td>
                    <td className="py-3 px-3">
                      <span
                        className="inline-block px-2 py-0.5 rounded-md text-xs font-medium"
                        style={{
                          background: "var(--blue-soft)",
                          color: "var(--blue-primary)",
                        }}
                      >
                        {ROLE_LABELS[m.role] || m.role}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <span
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
                        style={{
                          background: m.is_active
                            ? "rgba(5,150,105,0.1)"
                            : "rgba(220,38,38,0.1)",
                          color: m.is_active
                            ? "var(--success)"
                            : "var(--danger)",
                        }}
                      >
                        <span
                          className="w-1.5 h-1.5 rounded-full"
                          style={{
                            background: m.is_active
                              ? "var(--success)"
                              : "var(--danger)",
                          }}
                        />
                        {m.is_active ? "نشط" : "معطل"}
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
                      {new Date(m.created_at).toLocaleDateString("ar-IQ")}
                    </td>
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => toggleActive(m)}
                          className="px-2.5 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer"
                          title={m.is_active ? "تعطيل" : "تفعيل"}
                          style={{
                            background: m.is_active
                              ? "rgba(220,38,38,0.08)"
                              : "rgba(5,150,105,0.08)",
                            color: m.is_active
                              ? "var(--danger)"
                              : "var(--success)",
                          }}
                        >
                          {m.is_active ? (
                            <span className="flex items-center gap-1">
                              <ShieldOff size={13} />
                              تعطيل
                            </span>
                          ) : (
                            <span className="flex items-center gap-1">
                              <ShieldCheck size={13} />
                              تفعيل
                            </span>
                          )}
                        </button>
                        <button
                          onClick={() => resetPassword(m)}
                          className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer"
                          style={{
                            background: "var(--blue-soft)",
                            color: "var(--blue-primary)",
                          }}
                        >
                          <KeyRound size={13} />
                          إعادة تعيين كلمة المرور
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

      {/* Add Member Modal */}
      {showModal && (
        <AddMemberModal
          onClose={() => setShowModal(false)}
          onSuccess={() => {
            setShowModal(false);
            fetchTeam();
          }}
        />
      )}
    </div>
  );
}

/* ── Add Member Modal ────────────────────────────────────────── */

function AddMemberModal({
  onClose,
  onSuccess,
}: {
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<string>("support");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name || !email || !password) {
      toast.error("جميع الحقول مطلوبة");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/team", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password, role }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed");
      }

      toast.success("تمت إضافة العضو بنجاح");
      onSuccess();
    } catch (err: any) {
      toast.error(err.message || "فشل في إضافة العضو");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(15,23,42,0.5)" }}
    >
      <div
        className="w-full max-w-md rounded-2xl p-6"
        style={{
          background: "var(--bg-surface)",
          boxShadow: "var(--shadow-lg)",
        }}
      >
        <div className="flex items-center justify-between mb-5">
          <h3
            className="text-lg font-bold"
            style={{ color: "var(--text-primary)" }}
          >
            موظف جديد
          </h3>
          <button
            onClick={onClose}
            className="p-1 rounded-lg transition-colors cursor-pointer"
            style={{ color: "var(--text-muted)" }}
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              className="block text-sm mb-1"
              style={{ color: "var(--text-secondary)" }}
            >
              الاسم
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 rounded-lg text-sm outline-none"
              style={{
                background: "var(--bg-elevated)",
                border: "1px solid var(--border)",
                color: "var(--text-primary)",
              }}
              placeholder="أحمد محمد"
            />
          </div>

          <div>
            <label
              className="block text-sm mb-1"
              style={{ color: "var(--text-secondary)" }}
            >
              البريد الإلكتروني
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 rounded-lg text-sm outline-none"
              dir="ltr"
              style={{
                background: "var(--bg-elevated)",
                border: "1px solid var(--border)",
                color: "var(--text-primary)",
                fontFamily: "var(--font-jetbrains-mono)",
              }}
              placeholder="user@amper.iq"
            />
          </div>

          <div>
            <label
              className="block text-sm mb-1"
              style={{ color: "var(--text-secondary)" }}
            >
              كلمة المرور
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 rounded-lg text-sm outline-none"
              dir="ltr"
              style={{
                background: "var(--bg-elevated)",
                border: "1px solid var(--border)",
                color: "var(--text-primary)",
                fontFamily: "var(--font-jetbrains-mono)",
              }}
            />
          </div>

          <div>
            <label
              className="block text-sm mb-1"
              style={{ color: "var(--text-secondary)" }}
            >
              الدور
            </label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full px-3 py-2 rounded-lg text-sm outline-none cursor-pointer"
              style={{
                background: "var(--bg-elevated)",
                border: "1px solid var(--border)",
                color: "var(--text-primary)",
              }}
            >
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {ROLE_LABELS[r]}
                </option>
              ))}
            </select>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-2.5 rounded-xl text-sm font-medium text-white transition-colors cursor-pointer disabled:opacity-50"
            style={{
              background:
                "linear-gradient(135deg, var(--blue-primary), var(--violet))",
            }}
          >
            {submitting ? "جاري الإضافة..." : "إضافة العضو"}
          </button>
        </form>
      </div>
    </div>
  );
}
