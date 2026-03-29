"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Plus,
  X,
  Search,
  ExternalLink,
  Loader2,
  MessageSquare,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import toast from "react-hot-toast";

interface Ticket {
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
  _count: { replies: number };
}

interface TenantOption {
  id: string;
  name: string;
  owner_name: string;
  phone: string;
}

const statusLabels: Record<string, string> = {
  open: "مفتوحة",
  in_progress: "قيد المعالجة",
  closed: "مغلقة",
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

type TabKey = "open" | "in_progress" | "closed" | "all";

export default function TicketsPage() {
  const router = useRouter();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabKey>("open");

  // Counts per status
  const [openCount, setOpenCount] = useState(0);
  const [inProgressCount, setInProgressCount] = useState(0);
  const [closedCount, setClosedCount] = useState(0);

  // New ticket modal
  const [showNewTicketModal, setShowNewTicketModal] = useState(false);
  const [newTicketForm, setNewTicketForm] = useState({
    title: "",
    body: "",
    tenant_id: "",
    priority: "normal",
  });
  const [newTicketLoading, setNewTicketLoading] = useState(false);
  const [tenantSearch, setTenantSearch] = useState("");
  const [tenantOptions, setTenantOptions] = useState<TenantOption[]>([]);
  const [showTenantDropdown, setShowTenantDropdown] = useState(false);
  const [selectedTenantName, setSelectedTenantName] = useState("");

  const statusForTab = (tab: TabKey): string => {
    if (tab === "all") return "";
    return tab;
  };

  const fetchTickets = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("limit", "20");
      const status = statusForTab(activeTab);
      if (status) params.set("status", status);

      const res = await fetch(`/api/tickets?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setTickets(data.tickets);
        setTotal(data.total);
        setPages(data.pages);
      }
    } catch {
      console.error("Failed to fetch tickets");
    } finally {
      setLoading(false);
    }
  }, [page, activeTab]);

  const fetchCounts = useCallback(async () => {
    try {
      const [openRes, inProgressRes, closedRes] = await Promise.all([
        fetch("/api/tickets?status=open&limit=1"),
        fetch("/api/tickets?status=in_progress&limit=1"),
        fetch("/api/tickets?status=closed&limit=1"),
      ]);
      if (openRes.ok) {
        const data = await openRes.json();
        setOpenCount(data.total);
      }
      if (inProgressRes.ok) {
        const data = await inProgressRes.json();
        setInProgressCount(data.total);
      }
      if (closedRes.ok) {
        const data = await closedRes.json();
        setClosedCount(data.total);
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    fetchCounts();
  }, [fetchCounts]);

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  // Search tenants for new ticket modal
  useEffect(() => {
    if (!tenantSearch || tenantSearch.length < 2) {
      setTenantOptions([]);
      return;
    }
    const timeout = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/clients?search=${encodeURIComponent(tenantSearch)}&limit=10`
        );
        if (res.ok) {
          const data = await res.json();
          setTenantOptions(
            data.tenants.map((t: any) => ({
              id: t.id,
              name: t.name,
              owner_name: t.owner_name,
              phone: t.phone,
            }))
          );
          setShowTenantDropdown(true);
        }
      } catch {
        // ignore
      }
    }, 300);
    return () => clearTimeout(timeout);
  }, [tenantSearch]);

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTicketForm.title || !newTicketForm.body) {
      toast.error("يرجى تعبئة العنوان والتفاصيل");
      return;
    }
    setNewTicketLoading(true);
    try {
      const res = await fetch("/api/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newTicketForm.title,
          body: newTicketForm.body,
          tenant_id: newTicketForm.tenant_id || null,
          priority: newTicketForm.priority,
        }),
      });
      if (res.ok) {
        toast.success("تم إنشاء التذكرة بنجاح");
        setShowNewTicketModal(false);
        setNewTicketForm({ title: "", body: "", tenant_id: "", priority: "normal" });
        setSelectedTenantName("");
        setTenantSearch("");
        fetchTickets();
        fetchCounts();
      } else {
        const data = await res.json();
        toast.error(data.error || "فشل إنشاء التذكرة");
      }
    } catch {
      toast.error("حدث خطأ في الاتصال");
    } finally {
      setNewTicketLoading(false);
    }
  };

  const tabs: { key: TabKey; label: string; count?: number }[] = [
    { key: "open", label: "مفتوحة", count: openCount },
    { key: "in_progress", label: "قيد المعالجة", count: inProgressCount },
    { key: "closed", label: "مغلقة", count: closedCount },
    { key: "all", label: "الكل" },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <style>{`
        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>

      {/* Header with tabs and new ticket button */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "space-between",
        }}
      >
        {/* Tabs */}
        <div style={{ display: "flex", gap: 0 }}>
          {tabs.map((tab) => {
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => {
                  setActiveTab(tab.key);
                  setPage(1);
                }}
                style={{
                  padding: "10px 20px",
                  border: "none",
                  borderBottom: isActive
                    ? "2px solid var(--blue-primary)"
                    : "2px solid transparent",
                  background: "transparent",
                  color: isActive ? "var(--blue-primary)" : "var(--text-muted)",
                  fontSize: 14,
                  fontWeight: isActive ? 700 : 400,
                  fontFamily: "var(--font-tajawal)",
                  cursor: "pointer",
                  position: "relative",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  transition: "all 0.2s",
                }}
              >
                {tab.label}
                {tab.key === "open" && openCount > 0 && (
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      minWidth: 20,
                      height: 20,
                      borderRadius: 10,
                      background: "var(--danger)",
                      color: "#FFFFFF",
                      fontSize: 11,
                      fontWeight: 700,
                      fontFamily: "var(--font-rajdhani)",
                      padding: "0 6px",
                    }}
                  >
                    {openCount}
                  </span>
                )}
                {tab.count !== undefined && tab.key !== "open" && (
                  <span
                    style={{
                      fontSize: 12,
                      color: "var(--text-muted)",
                      fontFamily: "var(--font-rajdhani)",
                    }}
                  >
                    ({tab.count})
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* New Ticket Button */}
        <button
          onClick={() => setShowNewTicketModal(true)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "9px 20px",
            borderRadius: 12,
            border: "none",
            background:
              "linear-gradient(135deg, var(--blue-primary), var(--violet))",
            color: "#FFFFFF",
            fontSize: 14,
            fontWeight: 600,
            fontFamily: "var(--font-tajawal)",
            cursor: "pointer",
            boxShadow: "0 4px 16px rgba(27,79,216,0.3)",
          }}
        >
          <Plus size={16} />
          تذكرة جديدة
        </button>
      </div>

      {/* Tickets List */}
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {loading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              style={{
                background: "var(--bg-surface)",
                borderRadius: 16,
                padding: "20px 24px",
                boxShadow: "var(--shadow-md)",
                display: "flex",
                alignItems: "center",
                gap: 16,
              }}
            >
              <Skeleton width="100%" height="20px" />
            </div>
          ))
        ) : tickets.length === 0 ? (
          <div
            style={{
              background: "var(--bg-surface)",
              borderRadius: 16,
              padding: 60,
              boxShadow: "var(--shadow-md)",
              textAlign: "center",
            }}
          >
            <MessageSquare
              size={40}
              style={{ color: "var(--text-muted)", marginBottom: 12 }}
            />
            <p style={{ color: "var(--text-muted)", fontSize: 14, margin: 0 }}>
              لا توجد تذاكر
            </p>
          </div>
        ) : (
          tickets.map((ticket) => {
            const pStyle =
              priorityStyles[ticket.priority] || priorityStyles.normal;
            return (
              <div
                key={ticket.id}
                style={{
                  background: "var(--bg-surface)",
                  borderRadius: 16,
                  padding: "18px 24px",
                  boxShadow: "var(--shadow-md)",
                  display: "flex",
                  alignItems: "center",
                  gap: 16,
                  cursor: "pointer",
                  transition: "box-shadow 0.2s",
                  borderRight:
                    ticket.status === "open"
                      ? "3px solid var(--danger)"
                      : ticket.status === "in_progress"
                        ? "3px solid var(--warning)"
                        : "3px solid var(--success)",
                }}
                onClick={() => router.push(`/tickets/${ticket.id}`)}
              >
                {/* Title & Tenant */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p
                    style={{
                      margin: 0,
                      fontSize: 15,
                      fontWeight: 600,
                      color: "var(--text-primary)",
                      marginBottom: 4,
                    }}
                  >
                    {ticket.title}
                  </p>
                  <p
                    style={{
                      margin: 0,
                      fontSize: 13,
                      color: "var(--text-muted)",
                    }}
                  >
                    {ticket.tenant?.name || "بدون عميل"}
                    {ticket._count.replies > 0 && (
                      <span style={{ marginRight: 12 }}>
                        {ticket._count.replies} رد
                      </span>
                    )}
                  </p>
                </div>

                {/* Priority badge */}
                <span
                  style={{
                    display: "inline-block",
                    padding: "3px 10px",
                    borderRadius: 8,
                    fontSize: 12,
                    fontWeight: 600,
                    background: pStyle.bg,
                    color: pStyle.color,
                    whiteSpace: "nowrap",
                  }}
                >
                  {priorityLabels[ticket.priority] || ticket.priority}
                </span>

                {/* Assigned */}
                <div
                  style={{
                    width: 100,
                    textAlign: "center",
                    fontSize: 12,
                    color: ticket.assigned_to
                      ? "var(--text-secondary)"
                      : "var(--text-muted)",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {ticket.assigned_to ? "مسند" : "غير مسند"}
                </div>

                {/* Date */}
                <div
                  style={{
                    width: 100,
                    textAlign: "center",
                    fontSize: 12,
                    color: "var(--text-muted)",
                    whiteSpace: "nowrap",
                    fontFamily: "var(--font-rajdhani)",
                  }}
                >
                  {formatDate(ticket.created_at)}
                </div>

                {/* Open button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    router.push(`/tickets/${ticket.id}`);
                  }}
                  style={{
                    padding: "6px 14px",
                    borderRadius: 10,
                    border: "1px solid var(--border)",
                    background: "var(--bg-surface)",
                    color: "var(--blue-primary)",
                    fontSize: 13,
                    fontWeight: 600,
                    fontFamily: "var(--font-tajawal)",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    whiteSpace: "nowrap",
                  }}
                >
                  <ExternalLink size={14} />
                  فتح
                </button>
              </div>
            );
          })
        )}
      </div>

      {/* Pagination */}
      {pages > 1 && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
          }}
        >
          <button
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              border: "1px solid var(--border)",
              background: "var(--bg-surface)",
              color: page <= 1 ? "var(--text-muted)" : "var(--text-primary)",
              cursor: page <= 1 ? "not-allowed" : "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <ChevronRight size={16} />
          </button>
          <span
            style={{
              fontSize: 13,
              color: "var(--text-secondary)",
              padding: "0 8px",
              fontFamily: "var(--font-rajdhani)",
            }}
          >
            {page} / {pages}
          </span>
          <button
            disabled={page >= pages}
            onClick={() => setPage((p) => Math.min(pages, p + 1))}
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              border: "1px solid var(--border)",
              background: "var(--bg-surface)",
              color: page >= pages ? "var(--text-muted)" : "var(--text-primary)",
              cursor: page >= pages ? "not-allowed" : "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <ChevronLeft size={16} />
          </button>
        </div>
      )}

      {/* New Ticket Modal */}
      {showNewTicketModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 50,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(15,23,42,0.4)",
            backdropFilter: "blur(4px)",
          }}
          onClick={() => setShowNewTicketModal(false)}
        >
          <div
            style={{
              width: "100%",
              maxWidth: 520,
              background: "var(--bg-surface)",
              borderRadius: 20,
              boxShadow: "var(--shadow-lg)",
              padding: "28px 32px",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 24,
              }}
            >
              <h2
                style={{
                  fontSize: 18,
                  fontWeight: 700,
                  color: "var(--text-primary)",
                  margin: 0,
                }}
              >
                تذكرة جديدة
              </h2>
              <button
                onClick={() => setShowNewTicketModal(false)}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  border: "none",
                  background: "var(--bg-muted)",
                  color: "var(--text-muted)",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <X size={16} />
              </button>
            </div>

            <form
              onSubmit={handleCreateTicket}
              style={{ display: "flex", flexDirection: "column", gap: 16 }}
            >
              {/* Title */}
              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: 13,
                    fontWeight: 500,
                    color: "var(--text-secondary)",
                    marginBottom: 6,
                  }}
                >
                  العنوان *
                </label>
                <input
                  type="text"
                  required
                  value={newTicketForm.title}
                  onChange={(e) =>
                    setNewTicketForm((f) => ({ ...f, title: e.target.value }))
                  }
                  placeholder="عنوان التذكرة"
                  style={{
                    width: "100%",
                    padding: "10px 14px",
                    borderRadius: 12,
                    border: "1px solid var(--border)",
                    background: "var(--bg-surface)",
                    color: "var(--text-primary)",
                    fontSize: 14,
                    fontFamily: "var(--font-tajawal)",
                    outline: "none",
                    boxSizing: "border-box",
                  }}
                />
              </div>

              {/* Body */}
              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: 13,
                    fontWeight: 500,
                    color: "var(--text-secondary)",
                    marginBottom: 6,
                  }}
                >
                  التفاصيل *
                </label>
                <textarea
                  required
                  rows={4}
                  value={newTicketForm.body}
                  onChange={(e) =>
                    setNewTicketForm((f) => ({ ...f, body: e.target.value }))
                  }
                  placeholder="وصف المشكلة أو الطلب..."
                  style={{
                    width: "100%",
                    padding: "10px 14px",
                    borderRadius: 12,
                    border: "1px solid var(--border)",
                    background: "var(--bg-surface)",
                    color: "var(--text-primary)",
                    fontSize: 14,
                    fontFamily: "var(--font-tajawal)",
                    outline: "none",
                    resize: "vertical",
                    boxSizing: "border-box",
                  }}
                />
              </div>

              {/* Tenant Search */}
              <div style={{ position: "relative" }}>
                <label
                  style={{
                    display: "block",
                    fontSize: 13,
                    fontWeight: 500,
                    color: "var(--text-secondary)",
                    marginBottom: 6,
                  }}
                >
                  العميل
                </label>
                <div style={{ position: "relative" }}>
                  <Search
                    size={16}
                    style={{
                      position: "absolute",
                      right: 12,
                      top: "50%",
                      transform: "translateY(-50%)",
                      color: "var(--text-muted)",
                    }}
                  />
                  <input
                    type="text"
                    value={selectedTenantName || tenantSearch}
                    onChange={(e) => {
                      setTenantSearch(e.target.value);
                      setSelectedTenantName("");
                      setNewTicketForm((f) => ({ ...f, tenant_id: "" }));
                    }}
                    onFocus={() =>
                      tenantOptions.length > 0 && setShowTenantDropdown(true)
                    }
                    placeholder="ابحث باسم العميل أو رقم الهاتف..."
                    style={{
                      width: "100%",
                      padding: "10px 14px",
                      paddingRight: 36,
                      borderRadius: 12,
                      border: "1px solid var(--border)",
                      background: "var(--bg-surface)",
                      color: "var(--text-primary)",
                      fontSize: 14,
                      fontFamily: "var(--font-tajawal)",
                      outline: "none",
                      boxSizing: "border-box",
                    }}
                  />
                </div>
                {showTenantDropdown && tenantOptions.length > 0 && (
                  <div
                    style={{
                      position: "absolute",
                      top: "100%",
                      right: 0,
                      left: 0,
                      zIndex: 10,
                      marginTop: 4,
                      background: "var(--bg-surface)",
                      borderRadius: 12,
                      border: "1px solid var(--border)",
                      boxShadow: "var(--shadow-md)",
                      maxHeight: 200,
                      overflowY: "auto",
                    }}
                  >
                    {tenantOptions.map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => {
                          setNewTicketForm((f) => ({
                            ...f,
                            tenant_id: t.id,
                          }));
                          setSelectedTenantName(t.name);
                          setShowTenantDropdown(false);
                          setTenantSearch("");
                        }}
                        style={{
                          display: "block",
                          width: "100%",
                          padding: "10px 14px",
                          border: "none",
                          background: "transparent",
                          textAlign: "right",
                          cursor: "pointer",
                          fontSize: 14,
                          color: "var(--text-primary)",
                          fontFamily: "var(--font-tajawal)",
                          borderBottom: "1px solid var(--border)",
                        }}
                      >
                        <span style={{ fontWeight: 600 }}>{t.name}</span>
                        <span
                          style={{
                            color: "var(--text-muted)",
                            marginRight: 8,
                            fontSize: 12,
                          }}
                        >
                          {t.phone}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Priority */}
              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: 13,
                    fontWeight: 500,
                    color: "var(--text-secondary)",
                    marginBottom: 6,
                  }}
                >
                  الأولوية
                </label>
                <select
                  value={newTicketForm.priority}
                  onChange={(e) =>
                    setNewTicketForm((f) => ({ ...f, priority: e.target.value }))
                  }
                  style={{
                    width: "100%",
                    padding: "10px 14px",
                    borderRadius: 12,
                    border: "1px solid var(--border)",
                    background: "var(--bg-surface)",
                    color: "var(--text-primary)",
                    fontSize: 14,
                    fontFamily: "var(--font-tajawal)",
                    outline: "none",
                    cursor: "pointer",
                  }}
                >
                  <option value="high">عالي</option>
                  <option value="normal">متوسط</option>
                  <option value="low">منخفض</option>
                </select>
              </div>

              <button
                type="submit"
                disabled={newTicketLoading}
                style={{
                  width: "100%",
                  padding: "12px 0",
                  borderRadius: 12,
                  border: "none",
                  background:
                    "linear-gradient(135deg, var(--blue-primary), var(--violet))",
                  color: "#FFFFFF",
                  fontSize: 15,
                  fontWeight: 700,
                  fontFamily: "var(--font-tajawal)",
                  cursor: newTicketLoading ? "not-allowed" : "pointer",
                  opacity: newTicketLoading ? 0.7 : 1,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  marginTop: 8,
                }}
              >
                {newTicketLoading && (
                  <Loader2 size={16} className="animate-spin" />
                )}
                {newTicketLoading ? "جاري الإنشاء..." : "إنشاء التذكرة"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
