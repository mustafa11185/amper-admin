"use client";

import { useState, useEffect, useCallback } from "react";
import {
  DollarSign,
  CheckCircle2,
  Clock,
  CalendarDays,
  Plus,
  X,
  Search,
  ChevronLeft,
  ChevronRight,
  Loader2,
} from "lucide-react";
import toast from "react-hot-toast";

interface Invoice {
  id: string;
  tenant_id: string;
  amount: string;
  discount_amount: string;
  final_amount: string;
  plan: string;
  period_start: string;
  period_end: string;
  is_paid: boolean;
  paid_at: string | null;
  created_at: string;
  tenant: {
    id: string;
    name: string;
    owner_name: string;
    phone: string;
  };
}

interface Summary {
  total_revenue: number;
  paid: number;
  pending: number;
  this_month: number;
}

interface TenantOption {
  id: string;
  name: string;
  owner_name: string;
  phone: string;
}

const planLabels: Record<string, string> = {
  basic: "أساسي",
  gold: "ذهبي",
  fleet: "أسطول",
  custom: "مخصص",
};

const planColors: Record<string, { bg: string; color: string }> = {
  basic: { bg: "var(--blue-soft)", color: "var(--blue-primary)" },
  gold: { bg: "var(--gold-soft)", color: "var(--gold)" },
  fleet: { bg: "var(--violet-soft)", color: "var(--violet)" },
  custom: { bg: "#F1F5F9", color: "var(--text-secondary)" },
};

function formatNumber(n: number | string): string {
  return Number(n).toLocaleString("en-US");
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("ar-IQ", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatPeriod(start: string, end: string): string {
  const s = new Date(start);
  const e = new Date(end);
  return `${s.toLocaleDateString("ar-IQ", { month: "short", year: "numeric" })} - ${e.toLocaleDateString("ar-IQ", { month: "short", year: "numeric" })}`;
}

// Skeleton loader
function Skeleton({ width, height }: { width: string; height: string }) {
  return (
    <div
      style={{
        width,
        height,
        borderRadius: 8,
        background: "linear-gradient(90deg, var(--bg-muted) 25%, var(--bg-elevated) 50%, var(--bg-muted) 75%)",
        backgroundSize: "200% 100%",
        animation: "shimmer 1.5s infinite",
      }}
    />
  );
}

export default function BillingPage() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [summaryLoading, setSummaryLoading] = useState(true);

  // Filters
  const [statusFilter, setStatusFilter] = useState("");
  const [planFilter, setPlanFilter] = useState("");
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;
  const [selectedYear] = useState(currentYear);
  const [selectedMonth] = useState(0); // 0 = all

  // Payment modal
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentForm, setPaymentForm] = useState({
    tenant_id: "",
    amount: "",
    method: "cash",
    reference: "",
    notes: "",
  });
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [tenantSearch, setTenantSearch] = useState("");
  const [tenantOptions, setTenantOptions] = useState<TenantOption[]>([]);
  const [showTenantDropdown, setShowTenantDropdown] = useState(false);
  const [selectedTenantName, setSelectedTenantName] = useState("");

  const fetchSummary = useCallback(async () => {
    setSummaryLoading(true);
    try {
      const res = await fetch("/api/billing/summary");
      if (res.ok) {
        const data = await res.json();
        setSummary(data);
      }
    } catch {
      console.error("Failed to fetch summary");
    } finally {
      setSummaryLoading(false);
    }
  }, []);

  const fetchInvoices = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("limit", "20");
      if (statusFilter === "paid") params.set("is_paid", "true");
      if (statusFilter === "pending") params.set("is_paid", "false");
      if (planFilter) params.set("plan", planFilter);

      const res = await fetch(`/api/billing?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setInvoices(data.invoices);
        setTotal(data.total);
        setPages(data.pages);
      }
    } catch {
      console.error("Failed to fetch invoices");
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, planFilter]);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  // Search tenants for payment modal
  useEffect(() => {
    if (!tenantSearch || tenantSearch.length < 2) {
      setTenantOptions([]);
      return;
    }
    const timeout = setTimeout(async () => {
      try {
        const res = await fetch(`/api/clients?search=${encodeURIComponent(tenantSearch)}&limit=10`);
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

  const handlePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentForm.tenant_id || !paymentForm.amount || !paymentForm.method) {
      toast.error("يرجى تعبئة جميع الحقول المطلوبة");
      return;
    }
    setPaymentLoading(true);
    try {
      const res = await fetch("/api/billing/payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tenant_id: paymentForm.tenant_id,
          amount: parseFloat(paymentForm.amount),
          method: paymentForm.method,
          reference: paymentForm.reference || null,
          notes: paymentForm.notes || null,
        }),
      });
      if (res.ok) {
        toast.success("تم تسجيل الدفعة بنجاح");
        setShowPaymentModal(false);
        setPaymentForm({ tenant_id: "", amount: "", method: "cash", reference: "", notes: "" });
        setSelectedTenantName("");
        setTenantSearch("");
        fetchInvoices();
        fetchSummary();
      } else {
        const data = await res.json();
        toast.error(data.error || "فشل تسجيل الدفعة");
      }
    } catch {
      toast.error("حدث خطأ في الاتصال");
    } finally {
      setPaymentLoading(false);
    }
  };

  const summaryCards = [
    {
      label: "إجمالي الإيرادات",
      value: summary?.total_revenue ?? 0,
      icon: <DollarSign size={22} />,
      iconBg: "var(--blue-soft)",
      iconColor: "var(--blue-primary)",
    },
    {
      label: "المدفوع",
      value: summary?.paid ?? 0,
      icon: <CheckCircle2 size={22} />,
      iconBg: "#D1FAE5",
      iconColor: "var(--success)",
    },
    {
      label: "المعلق",
      value: summary?.pending ?? 0,
      icon: <Clock size={22} />,
      iconBg: "var(--gold-soft)",
      iconColor: "var(--warning)",
    },
    {
      label: "هذا الشهر",
      value: summary?.this_month ?? 0,
      icon: <CalendarDays size={22} />,
      iconBg: "var(--violet-soft)",
      iconColor: "var(--violet)",
    },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <style>{`
        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>

      {/* Summary Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}>
        {summaryCards.map((card, i) => (
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
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                background: card.iconBg,
                color: card.iconColor,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              {card.icon}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p
                style={{
                  fontSize: 13,
                  color: "var(--text-muted)",
                  margin: 0,
                  marginBottom: 4,
                }}
              >
                {card.label}
              </p>
              {summaryLoading ? (
                <Skeleton width="80px" height="28px" />
              ) : (
                <p
                  style={{
                    fontSize: 22,
                    fontWeight: 700,
                    fontFamily: "var(--font-rajdhani)",
                    color: "var(--text-primary)",
                    margin: 0,
                    direction: "ltr",
                    textAlign: "right",
                  }}
                >
                  {formatNumber(card.value)}{" "}
                  <span style={{ fontSize: 13, fontWeight: 500, color: "var(--text-muted)" }}>
                    د.ع
                  </span>
                </p>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Filters Row */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        {/* Status filter */}
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          style={{
            padding: "8px 14px",
            borderRadius: 10,
            border: "1px solid var(--border)",
            background: "var(--bg-surface)",
            color: "var(--text-primary)",
            fontSize: 14,
            fontFamily: "var(--font-tajawal)",
            cursor: "pointer",
            outline: "none",
          }}
        >
          <option value="">جميع الحالات</option>
          <option value="paid">مدفوعة</option>
          <option value="pending">معلقة</option>
        </select>

        {/* Plan filter */}
        <select
          value={planFilter}
          onChange={(e) => { setPlanFilter(e.target.value); setPage(1); }}
          style={{
            padding: "8px 14px",
            borderRadius: 10,
            border: "1px solid var(--border)",
            background: "var(--bg-surface)",
            color: "var(--text-primary)",
            fontSize: 14,
            fontFamily: "var(--font-tajawal)",
            cursor: "pointer",
            outline: "none",
          }}
        >
          <option value="">جميع الباقات</option>
          <option value="basic">أساسي</option>
          <option value="gold">ذهبي</option>
          <option value="fleet">أسطول</option>
          <option value="custom">مخصص</option>
        </select>

        <div style={{ flex: 1 }} />

        {/* Record Payment Button */}
        <button
          onClick={() => setShowPaymentModal(true)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "9px 20px",
            borderRadius: 12,
            border: "none",
            background: "linear-gradient(135deg, var(--blue-primary), var(--violet))",
            color: "#FFFFFF",
            fontSize: 14,
            fontWeight: 600,
            fontFamily: "var(--font-tajawal)",
            cursor: "pointer",
            boxShadow: "0 4px 16px rgba(27,79,216,0.3)",
          }}
        >
          <Plus size={16} />
          تسجيل دفعة
        </button>
      </div>

      {/* Invoices Table */}
      <div
        style={{
          background: "var(--bg-surface)",
          borderRadius: 16,
          boxShadow: "var(--shadow-md)",
          overflow: "hidden",
        }}
      >
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "var(--bg-elevated)" }}>
                {["العميل", "الباقة", "الفترة", "المبلغ", "الخصم", "الصافي", "الحالة", "تاريخ الإصدار"].map(
                  (h) => (
                    <th
                      key={h}
                      style={{
                        padding: "12px 16px",
                        fontSize: 13,
                        fontWeight: 600,
                        color: "var(--text-muted)",
                        textAlign: "right",
                        whiteSpace: "nowrap",
                        borderBottom: "1px solid var(--border)",
                      }}
                    >
                      {h}
                    </th>
                  )
                )}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 8 }).map((_, j) => (
                      <td key={j} style={{ padding: "14px 16px" }}>
                        <Skeleton width="80px" height="16px" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : invoices.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    style={{
                      padding: 40,
                      textAlign: "center",
                      color: "var(--text-muted)",
                      fontSize: 14,
                    }}
                  >
                    لا توجد فواتير
                  </td>
                </tr>
              ) : (
                invoices.map((inv) => {
                  const planStyle = planColors[inv.plan] || planColors.custom;
                  return (
                    <tr
                      key={inv.id}
                      style={{ borderBottom: "1px solid var(--border)" }}
                    >
                      <td style={{ padding: "14px 16px" }}>
                        <div>
                          <p
                            style={{
                              margin: 0,
                              fontSize: 14,
                              fontWeight: 600,
                              color: "var(--text-primary)",
                            }}
                          >
                            {inv.tenant?.name || "-"}
                          </p>
                          <p
                            style={{
                              margin: 0,
                              fontSize: 12,
                              color: "var(--text-muted)",
                            }}
                          >
                            {inv.tenant?.owner_name}
                          </p>
                        </div>
                      </td>
                      <td style={{ padding: "14px 16px" }}>
                        <span
                          style={{
                            display: "inline-block",
                            padding: "3px 10px",
                            borderRadius: 8,
                            fontSize: 12,
                            fontWeight: 600,
                            background: planStyle.bg,
                            color: planStyle.color,
                          }}
                        >
                          {planLabels[inv.plan] || inv.plan}
                        </span>
                      </td>
                      <td
                        style={{
                          padding: "14px 16px",
                          fontSize: 13,
                          color: "var(--text-secondary)",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {formatPeriod(inv.period_start, inv.period_end)}
                      </td>
                      <td
                        style={{
                          padding: "14px 16px",
                          fontSize: 14,
                          fontWeight: 600,
                          fontFamily: "var(--font-rajdhani)",
                          color: "var(--text-primary)",
                          direction: "ltr",
                          textAlign: "right",
                        }}
                      >
                        {formatNumber(inv.amount)}
                      </td>
                      <td
                        style={{
                          padding: "14px 16px",
                          fontSize: 14,
                          fontFamily: "var(--font-rajdhani)",
                          color: Number(inv.discount_amount) > 0 ? "var(--danger)" : "var(--text-muted)",
                          direction: "ltr",
                          textAlign: "right",
                        }}
                      >
                        {Number(inv.discount_amount) > 0
                          ? `-${formatNumber(inv.discount_amount)}`
                          : "0"}
                      </td>
                      <td
                        style={{
                          padding: "14px 16px",
                          fontSize: 14,
                          fontWeight: 700,
                          fontFamily: "var(--font-rajdhani)",
                          color: "var(--text-primary)",
                          direction: "ltr",
                          textAlign: "right",
                        }}
                      >
                        {formatNumber(inv.final_amount)}{" "}
                        <span style={{ fontSize: 11, fontWeight: 400, color: "var(--text-muted)" }}>
                          د.ع
                        </span>
                      </td>
                      <td style={{ padding: "14px 16px" }}>
                        <span
                          style={{
                            display: "inline-block",
                            padding: "3px 10px",
                            borderRadius: 8,
                            fontSize: 12,
                            fontWeight: 600,
                            background: inv.is_paid ? "#D1FAE5" : "var(--gold-soft)",
                            color: inv.is_paid ? "var(--success)" : "var(--warning)",
                          }}
                        >
                          {inv.is_paid ? "مدفوعة" : "معلقة"}
                        </span>
                      </td>
                      <td
                        style={{
                          padding: "14px 16px",
                          fontSize: 13,
                          color: "var(--text-muted)",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {formatDate(inv.created_at)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pages > 1 && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              padding: "16px",
              borderTop: "1px solid var(--border)",
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
      </div>

      {/* Record Payment Modal */}
      {showPaymentModal && (
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
          onClick={() => setShowPaymentModal(false)}
        >
          <div
            style={{
              width: "100%",
              maxWidth: 480,
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
                تسجيل دفعة
              </h2>
              <button
                onClick={() => setShowPaymentModal(false)}
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

            <form onSubmit={handlePayment} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
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
                  العميل *
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
                      setPaymentForm((f) => ({ ...f, tenant_id: "" }));
                    }}
                    onFocus={() => tenantOptions.length > 0 && setShowTenantDropdown(true)}
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
                          setPaymentForm((f) => ({ ...f, tenant_id: t.id }));
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
                        <span style={{ color: "var(--text-muted)", marginRight: 8, fontSize: 12 }}>
                          {t.phone}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Amount */}
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
                  المبلغ (د.ع) *
                </label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  required
                  value={paymentForm.amount}
                  onChange={(e) => setPaymentForm((f) => ({ ...f, amount: e.target.value }))}
                  placeholder="0"
                  dir="ltr"
                  style={{
                    width: "100%",
                    padding: "10px 14px",
                    borderRadius: 12,
                    border: "1px solid var(--border)",
                    background: "var(--bg-surface)",
                    color: "var(--text-primary)",
                    fontSize: 14,
                    fontFamily: "var(--font-rajdhani)",
                    outline: "none",
                    boxSizing: "border-box",
                  }}
                />
              </div>

              {/* Method */}
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
                  طريقة الدفع *
                </label>
                <select
                  value={paymentForm.method}
                  onChange={(e) => setPaymentForm((f) => ({ ...f, method: e.target.value }))}
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
                  <option value="cash">نقدي</option>
                  <option value="bank">تحويل بنكي</option>
                </select>
              </div>

              {/* Reference */}
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
                  رقم المرجع
                </label>
                <input
                  type="text"
                  value={paymentForm.reference}
                  onChange={(e) => setPaymentForm((f) => ({ ...f, reference: e.target.value }))}
                  placeholder="اختياري"
                  dir="ltr"
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

              {/* Notes */}
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
                  ملاحظات
                </label>
                <textarea
                  value={paymentForm.notes}
                  onChange={(e) => setPaymentForm((f) => ({ ...f, notes: e.target.value }))}
                  placeholder="اختياري"
                  rows={3}
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

              <button
                type="submit"
                disabled={paymentLoading}
                style={{
                  width: "100%",
                  padding: "12px 0",
                  borderRadius: 12,
                  border: "none",
                  background: "linear-gradient(135deg, var(--blue-primary), var(--violet))",
                  color: "#FFFFFF",
                  fontSize: 15,
                  fontWeight: 700,
                  fontFamily: "var(--font-tajawal)",
                  cursor: paymentLoading ? "not-allowed" : "pointer",
                  opacity: paymentLoading ? 0.7 : 1,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  marginTop: 8,
                }}
              >
                {paymentLoading && <Loader2 size={16} className="animate-spin" />}
                {paymentLoading ? "جاري التسجيل..." : "تسجيل الدفعة"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
