"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowRight,
  Send,
  Loader2,
  User,
  Calendar,
  Clock,
  Phone,
  Building2,
} from "lucide-react";
import toast from "react-hot-toast";

interface Reply {
  id: string;
  ticket_id: string;
  author_id: string;
  author_type: string;
  body: string;
  created_at: string;
}

interface TicketData {
  id: string;
  tenant_id: string | null;
  title: string;
  body: string;
  status: string;
  priority: string;
  assigned_to: string | null;
  created_at: string;
  updated_at: string;
  tenant: {
    id: string;
    name: string;
    owner_name: string;
    phone: string;
  } | null;
  replies: Reply[];
}

interface CompanyUserOption {
  id: string;
  name: string;
  email: string;
  role: string;
}

const statusLabels: Record<string, string> = {
  open: "مفتوحة",
  in_progress: "قيد المعالجة",
  closed: "مغلقة",
};

const statusStyles: Record<string, { bg: string; color: string }> = {
  open: { bg: "#FEE2E2", color: "var(--danger)" },
  in_progress: { bg: "var(--gold-soft)", color: "var(--warning)" },
  closed: { bg: "#D1FAE5", color: "var(--success)" },
};

const priorityLabels: Record<string, string> = {
  high: "عالي",
  normal: "متوسط",
  low: "منخفض",
};

const priorityStyles: Record<string, { bg: string; color: string }> = {
  high: { bg: "#FEE2E2", color: "var(--danger)" },
  normal: { bg: "var(--gold-soft)", color: "var(--warning)" },
  low: { bg: "#F1F5F9", color: "var(--text-muted)" },
};

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("ar-IQ", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatDateTime(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("ar-IQ", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function Skeleton({ width, height }: { width: string; height: string }) {
  return (
    <div
      style={{
        width,
        height,
        borderRadius: 8,
        background:
          "linear-gradient(90deg, var(--bg-muted) 25%, var(--bg-elevated) 50%, var(--bg-muted) 75%)",
        backgroundSize: "200% 100%",
        animation: "shimmer 1.5s infinite",
      }}
    />
  );
}

export default function TicketDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [ticket, setTicket] = useState<TicketData | null>(null);
  const [loading, setLoading] = useState(true);
  const [replyText, setReplyText] = useState("");
  const [replySending, setReplySending] = useState(false);

  const [companyUsers, setCompanyUsers] = useState<CompanyUserOption[]>([]);
  const [updatingAssigned, setUpdatingAssigned] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const fetchTicket = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/tickets/${id}`);
      if (res.ok) {
        const data = await res.json();
        setTicket(data.ticket);
      } else {
        toast.error("لم يتم العثور على التذكرة");
        router.push("/tickets");
      }
    } catch {
      toast.error("حدث خطأ في الاتصال");
    } finally {
      setLoading(false);
    }
  }, [id, router]);

  const fetchCompanyUsers = useCallback(async () => {
    try {
      const res = await fetch("/api/team?limit=100");
      if (res.ok) {
        const data = await res.json();
        setCompanyUsers(
          (data.users || []).map((u: any) => ({
            id: u.id,
            name: u.name,
            email: u.email,
            role: u.role,
          }))
        );
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    fetchTicket();
    fetchCompanyUsers();
  }, [fetchTicket, fetchCompanyUsers]);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [ticket?.replies]);

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim()) return;
    setReplySending(true);
    try {
      const res = await fetch(`/api/tickets/${id}/reply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: replyText }),
      });
      if (res.ok) {
        setReplyText("");
        fetchTicket();
      } else {
        const data = await res.json();
        toast.error(data.error || "فشل إرسال الرد");
      }
    } catch {
      toast.error("حدث خطأ في الاتصال");
    } finally {
      setReplySending(false);
    }
  };

  const handleUpdateAssigned = async (assignedTo: string) => {
    setUpdatingAssigned(true);
    try {
      const res = await fetch(`/api/tickets/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assigned_to: assignedTo || null,
        }),
      });
      if (res.ok) {
        toast.success("تم تحديث المسؤول");
        fetchTicket();
      } else {
        toast.error("فشل التحديث");
      }
    } catch {
      toast.error("حدث خطأ");
    } finally {
      setUpdatingAssigned(false);
    }
  };

  const handleUpdateStatus = async (newStatus: string) => {
    setUpdatingStatus(true);
    try {
      const res = await fetch(`/api/tickets/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        toast.success("تم تحديث الحالة");
        fetchTicket();
      } else {
        toast.error("فشل التحديث");
      }
    } catch {
      toast.error("حدث خطأ");
    } finally {
      setUpdatingStatus(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        <style>{`
          @keyframes shimmer {
            0% { background-position: 200% 0; }
            100% { background-position: -200% 0; }
          }
        `}</style>
        <Skeleton width="200px" height="32px" />
        <div style={{ display: "flex", gap: 24 }}>
          <div style={{ flex: 1 }}>
            <Skeleton width="100%" height="400px" />
          </div>
          <div style={{ width: 300 }}>
            <Skeleton width="100%" height="300px" />
          </div>
        </div>
      </div>
    );
  }

  if (!ticket) return null;

  const sStyle = statusStyles[ticket.status] || statusStyles.open;
  const pStyle = priorityStyles[ticket.priority] || priorityStyles.normal;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <style>{`
        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>

      {/* Back button */}
      <button
        onClick={() => router.push("/tickets")}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          padding: "6px 12px",
          borderRadius: 10,
          border: "none",
          background: "transparent",
          color: "var(--text-muted)",
          fontSize: 14,
          fontFamily: "var(--font-tajawal)",
          cursor: "pointer",
          alignSelf: "flex-start",
        }}
      >
        <ArrowRight size={16} />
        العودة إلى التذاكر
      </button>

      {/* Two column layout */}
      <div style={{ display: "flex", gap: 24, alignItems: "flex-start" }}>
        {/* Main Column */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 20, minWidth: 0 }}>
          {/* Header */}
          <div
            style={{
              background: "var(--bg-surface)",
              borderRadius: 16,
              padding: "24px",
              boxShadow: "var(--shadow-md)",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "flex-start",
                justifyContent: "space-between",
                gap: 16,
                marginBottom: 16,
              }}
            >
              <h1
                style={{
                  fontSize: 20,
                  fontWeight: 700,
                  color: "var(--text-primary)",
                  margin: 0,
                  flex: 1,
                }}
              >
                {ticket.title}
              </h1>
              <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                <span
                  style={{
                    display: "inline-block",
                    padding: "4px 12px",
                    borderRadius: 8,
                    fontSize: 12,
                    fontWeight: 600,
                    background: sStyle.bg,
                    color: sStyle.color,
                  }}
                >
                  {statusLabels[ticket.status] || ticket.status}
                </span>
                <span
                  style={{
                    display: "inline-block",
                    padding: "4px 12px",
                    borderRadius: 8,
                    fontSize: 12,
                    fontWeight: 600,
                    background: pStyle.bg,
                    color: pStyle.color,
                  }}
                >
                  {priorityLabels[ticket.priority] || ticket.priority}
                </span>
              </div>
            </div>

            {/* Assign To */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
              }}
            >
              <span
                style={{
                  fontSize: 13,
                  color: "var(--text-muted)",
                  whiteSpace: "nowrap",
                }}
              >
                المسؤول:
              </span>
              <select
                value={ticket.assigned_to || ""}
                onChange={(e) => handleUpdateAssigned(e.target.value)}
                disabled={updatingAssigned}
                style={{
                  padding: "6px 12px",
                  borderRadius: 10,
                  border: "1px solid var(--border)",
                  background: "var(--bg-surface)",
                  color: "var(--text-primary)",
                  fontSize: 13,
                  fontFamily: "var(--font-tajawal)",
                  outline: "none",
                  cursor: "pointer",
                  opacity: updatingAssigned ? 0.5 : 1,
                }}
              >
                <option value="">غير مسند</option>
                {companyUsers.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.email})
                  </option>
                ))}
              </select>

              <div style={{ flex: 1 }} />

              {/* Status change */}
              <span
                style={{
                  fontSize: 13,
                  color: "var(--text-muted)",
                  whiteSpace: "nowrap",
                }}
              >
                الحالة:
              </span>
              <select
                value={ticket.status}
                onChange={(e) => handleUpdateStatus(e.target.value)}
                disabled={updatingStatus}
                style={{
                  padding: "6px 12px",
                  borderRadius: 10,
                  border: "1px solid var(--border)",
                  background: "var(--bg-surface)",
                  color: "var(--text-primary)",
                  fontSize: 13,
                  fontFamily: "var(--font-tajawal)",
                  outline: "none",
                  cursor: "pointer",
                  opacity: updatingStatus ? 0.5 : 1,
                }}
              >
                <option value="open">مفتوحة</option>
                <option value="in_progress">قيد المعالجة</option>
                <option value="closed">مغلقة</option>
              </select>
            </div>
          </div>

          {/* Original ticket body */}
          <div
            style={{
              background: "var(--bg-muted)",
              borderRadius: 16,
              padding: "20px 24px",
              boxShadow: "var(--shadow-sm, 0 1px 3px rgba(15,23,42,0.06))",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                marginBottom: 12,
              }}
            >
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: "50%",
                  background: "var(--gold-soft)",
                  color: "var(--gold)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 12,
                  fontWeight: 700,
                }}
              >
                {ticket.tenant?.owner_name?.charAt(0) || "؟"}
              </div>
              <span
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: "var(--text-primary)",
                }}
              >
                {ticket.tenant?.owner_name || "غير معروف"}
              </span>
              <span
                style={{
                  fontSize: 12,
                  color: "var(--text-muted)",
                  marginRight: 8,
                }}
              >
                {formatDateTime(ticket.created_at)}
              </span>
            </div>
            <p
              style={{
                fontSize: 14,
                lineHeight: 1.8,
                color: "var(--text-secondary)",
                margin: 0,
                whiteSpace: "pre-wrap",
              }}
            >
              {ticket.body}
            </p>
          </div>

          {/* Replies Thread */}
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {ticket.replies.map((reply) => {
              const isStaff = reply.author_type === "company_user";
              return (
                <div
                  key={reply.id}
                  style={{
                    background: isStaff
                      ? "var(--bg-surface)"
                      : "var(--bg-muted)",
                    borderRadius: 16,
                    padding: "16px 20px",
                    boxShadow: isStaff
                      ? "var(--shadow-sm, 0 1px 3px rgba(15,23,42,0.06))"
                      : "none",
                    borderRight: isStaff
                      ? "3px solid var(--blue-primary)"
                      : "3px solid var(--gold)",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      marginBottom: 8,
                    }}
                  >
                    <div
                      style={{
                        width: 24,
                        height: 24,
                        borderRadius: "50%",
                        background: isStaff
                          ? "var(--blue-soft)"
                          : "var(--gold-soft)",
                        color: isStaff
                          ? "var(--blue-primary)"
                          : "var(--gold)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 11,
                        fontWeight: 700,
                      }}
                    >
                      <User size={12} />
                    </div>
                    <span
                      style={{
                        fontSize: 12,
                        fontWeight: 600,
                        color: isStaff
                          ? "var(--blue-primary)"
                          : "var(--gold)",
                      }}
                    >
                      {isStaff ? "فريق الدعم" : "العميل"}
                    </span>
                    <span
                      style={{
                        fontSize: 11,
                        color: "var(--text-muted)",
                        marginRight: 8,
                      }}
                    >
                      {formatDateTime(reply.created_at)}
                    </span>
                  </div>
                  <p
                    style={{
                      fontSize: 14,
                      lineHeight: 1.8,
                      color: "var(--text-secondary)",
                      margin: 0,
                      whiteSpace: "pre-wrap",
                    }}
                  >
                    {reply.body}
                  </p>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>

          {/* Reply Box */}
          {ticket.status !== "closed" && (
            <form
              onSubmit={handleSendReply}
              style={{
                background: "var(--bg-surface)",
                borderRadius: 16,
                padding: "16px 20px",
                boxShadow: "var(--shadow-md)",
                display: "flex",
                gap: 12,
                alignItems: "flex-end",
              }}
            >
              <textarea
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder="اكتب ردك هنا..."
                rows={3}
                style={{
                  flex: 1,
                  padding: "10px 14px",
                  borderRadius: 12,
                  border: "1px solid var(--border)",
                  background: "var(--bg-elevated)",
                  color: "var(--text-primary)",
                  fontSize: 14,
                  fontFamily: "var(--font-tajawal)",
                  outline: "none",
                  resize: "vertical",
                  boxSizing: "border-box",
                }}
              />
              <button
                type="submit"
                disabled={replySending || !replyText.trim()}
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 12,
                  border: "none",
                  background:
                    replySending || !replyText.trim()
                      ? "var(--bg-muted)"
                      : "linear-gradient(135deg, var(--blue-primary), var(--violet))",
                  color:
                    replySending || !replyText.trim()
                      ? "var(--text-muted)"
                      : "#FFFFFF",
                  cursor:
                    replySending || !replyText.trim()
                      ? "not-allowed"
                      : "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                {replySending ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <Send size={18} />
                )}
              </button>
            </form>
          )}

          {ticket.status === "closed" && (
            <div
              style={{
                background: "#D1FAE5",
                borderRadius: 12,
                padding: "12px 20px",
                textAlign: "center",
                fontSize: 14,
                color: "var(--success)",
                fontWeight: 600,
              }}
            >
              تم إغلاق هذه التذكرة
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div
          style={{
            width: 300,
            flexShrink: 0,
            display: "flex",
            flexDirection: "column",
            gap: 16,
          }}
        >
          {/* Client Info Card */}
          <div
            style={{
              background: "var(--bg-surface)",
              borderRadius: 16,
              padding: "20px",
              boxShadow: "var(--shadow-md)",
            }}
          >
            <h3
              style={{
                fontSize: 14,
                fontWeight: 700,
                color: "var(--text-primary)",
                margin: 0,
                marginBottom: 16,
              }}
            >
              معلومات العميل
            </h3>
            {ticket.tenant ? (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 12,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <Building2 size={16} style={{ color: "var(--text-muted)", flexShrink: 0 }} />
                  <div>
                    <p
                      style={{
                        margin: 0,
                        fontSize: 14,
                        fontWeight: 600,
                        color: "var(--text-primary)",
                      }}
                    >
                      {ticket.tenant.name}
                    </p>
                    <p
                      style={{
                        margin: 0,
                        fontSize: 12,
                        color: "var(--text-muted)",
                      }}
                    >
                      {ticket.tenant.owner_name}
                    </p>
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <Phone size={16} style={{ color: "var(--text-muted)", flexShrink: 0 }} />
                  <span
                    style={{
                      fontSize: 13,
                      color: "var(--text-secondary)",
                      fontFamily: "var(--font-rajdhani)",
                      direction: "ltr",
                    }}
                  >
                    {ticket.tenant.phone}
                  </span>
                </div>
              </div>
            ) : (
              <p
                style={{
                  fontSize: 13,
                  color: "var(--text-muted)",
                  margin: 0,
                }}
              >
                بدون عميل مرتبط
              </p>
            )}
          </div>

          {/* Ticket Metadata Card */}
          <div
            style={{
              background: "var(--bg-surface)",
              borderRadius: 16,
              padding: "20px",
              boxShadow: "var(--shadow-md)",
            }}
          >
            <h3
              style={{
                fontSize: 14,
                fontWeight: 700,
                color: "var(--text-primary)",
                margin: 0,
                marginBottom: 16,
              }}
            >
              تفاصيل التذكرة
            </h3>
            <div
              style={{ display: "flex", flexDirection: "column", gap: 14 }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <Calendar size={16} style={{ color: "var(--text-muted)", flexShrink: 0 }} />
                <div>
                  <p
                    style={{
                      margin: 0,
                      fontSize: 11,
                      color: "var(--text-muted)",
                    }}
                  >
                    تاريخ الإنشاء
                  </p>
                  <p
                    style={{
                      margin: 0,
                      fontSize: 13,
                      color: "var(--text-secondary)",
                    }}
                  >
                    {formatDateTime(ticket.created_at)}
                  </p>
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <Clock size={16} style={{ color: "var(--text-muted)", flexShrink: 0 }} />
                <div>
                  <p
                    style={{
                      margin: 0,
                      fontSize: 11,
                      color: "var(--text-muted)",
                    }}
                  >
                    آخر تحديث
                  </p>
                  <p
                    style={{
                      margin: 0,
                      fontSize: 13,
                      color: "var(--text-secondary)",
                    }}
                  >
                    {formatDateTime(ticket.updated_at)}
                  </p>
                </div>
              </div>

              <div>
                <p
                  style={{
                    margin: 0,
                    fontSize: 11,
                    color: "var(--text-muted)",
                    marginBottom: 4,
                  }}
                >
                  الحالة
                </p>
                <span
                  style={{
                    display: "inline-block",
                    padding: "3px 10px",
                    borderRadius: 8,
                    fontSize: 12,
                    fontWeight: 600,
                    background: sStyle.bg,
                    color: sStyle.color,
                  }}
                >
                  {statusLabels[ticket.status] || ticket.status}
                </span>
              </div>

              <div>
                <p
                  style={{
                    margin: 0,
                    fontSize: 11,
                    color: "var(--text-muted)",
                    marginBottom: 4,
                  }}
                >
                  الأولوية
                </p>
                <span
                  style={{
                    display: "inline-block",
                    padding: "3px 10px",
                    borderRadius: 8,
                    fontSize: 12,
                    fontWeight: 600,
                    background: pStyle.bg,
                    color: pStyle.color,
                  }}
                >
                  {priorityLabels[ticket.priority] || ticket.priority}
                </span>
              </div>

              <div>
                <p
                  style={{
                    margin: 0,
                    fontSize: 11,
                    color: "var(--text-muted)",
                    marginBottom: 4,
                  }}
                >
                  عدد الردود
                </p>
                <span
                  style={{
                    fontSize: 14,
                    fontWeight: 700,
                    fontFamily: "var(--font-rajdhani)",
                    color: "var(--text-primary)",
                  }}
                >
                  {ticket.replies.length}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
