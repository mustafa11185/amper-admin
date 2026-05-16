/**
 * GET /api/endur-ai/ticket-triage — P-CO-3.3 (2026-05-16).
 *
 * ذكاء اندر — فرز التذاكر. Deterministic, explainable triage of open
 * support tickets (same philosophy as the cross-sell / exec-brief
 * engines: no LLM, no vendor name, swappable later behind an env
 * flag). For each open ticket: severity, product routing, SLA risk,
 * and an Arabic suggested first response.
 *
 * UI surfaces this strictly as «ذكاء اندر».
 */
export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { withGuard } from "@/lib/api-route";

type Severity = "critical" | "high" | "normal";
type SlaRisk = "breached" | "at_risk" | "ok";

const SEV_RANK: Record<Severity, number> = {
  critical: 0,
  high: 1,
  normal: 2,
};
// SLA budget (hours) before first-response is considered breached.
const SLA_HOURS: Record<Severity, number> = {
  critical: 4,
  high: 12,
  normal: 48,
};

const CRITICAL_KW = [
  "توقف",
  "متوقف",
  "لا يعمل",
  "معطل",
  "تعطل",
  "عاجل",
  "خطأ",
  "crash",
  "down",
  "لا استطيع",
  "ضياع",
  "فقدان",
];
const ROUTE_KW: { key: "AMPER" | "RESTOIQ" | "BARQ"; kw: string[] }[] = [
  {
    key: "RESTOIQ",
    kw: ["ريستو", "مطعم", "طلب", "مطبخ", "منيو", "كاشير", "طاولة"],
  },
  {
    key: "AMPER",
    kw: ["مولد", "امبير", "اشتراك", "جباية", "كهرباء", "عداد", "مشترك"],
  },
  { key: "BARQ", kw: ["براق", "تسويق", "حملة", "اعلان", "وصول"] },
];

function sevFromTicket(
  priority: string,
  ageH: number,
  text: string,
): Severity {
  const t = text.toLowerCase();
  const hasCriticalKw = CRITICAL_KW.some((k) => t.includes(k));
  if (hasCriticalKw) return "critical";
  if (priority === "urgent" || priority === "high") {
    return ageH > 24 ? "critical" : "high";
  }
  if (ageH > 72) return "high";
  return "normal";
}

function routeProduct(
  tenantId: string | null,
  text: string,
): "AMPER" | "RESTOIQ" | "BARQ" | "غير محدّد" {
  const t = text.toLowerCase();
  for (const r of ROUTE_KW) {
    if (r.kw.some((k) => t.includes(k))) return r.key;
  }
  // Amper tenants are the only ones soft-linked via tenant_id.
  if (tenantId) return "AMPER";
  return "غير محدّد";
}

function slaRisk(sev: Severity, ageH: number): SlaRisk {
  const budget = SLA_HOURS[sev];
  if (ageH > budget) return "breached";
  if (ageH > budget * 0.7) return "at_risk";
  return "ok";
}

function suggestedReply(
  sev: Severity,
  product: string,
  customerName: string,
): string {
  const who = customerName ? customerName : "عميلنا العزيز";
  if (sev === "critical") {
    return `مرحباً ${who} 👋 استلمنا بلاغكم ونعتبره أولويّة قصوى — فريق ${product === "غير محدّد" ? "الدعم" : product} يعمل عليه الآن. سنوافيكم بتحديث خلال وقت قصير، ونعتذر عن أيّ انقطاع.`;
  }
  if (sev === "high") {
    return `مرحباً ${who} 👋 شكراً لتواصلكم. تمّ تصعيد طلبكم لفريق ${product === "غير محدّد" ? "الدعم المختص" : product} وسنعالجه بأولويّة. نرجّع لكم بالحلّ أو بسؤال توضيحي قريباً.`;
  }
  return `مرحباً ${who} 👋 شكراً لتواصلكم مع دعم اندر. سجّلنا طلبكم وسيتابعه الفريق المختص. إذا توفّرت تفاصيل إضافيّة (صورة/خطوات) ترسلونها تساعدنا نسرّع الحلّ.`;
}

async function GET_() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = Date.now();
  const tickets = await prisma.supportTicket.findMany({
    where: { status: { not: "closed" } },
    take: 500,
    orderBy: { created_at: "asc" },
    select: {
      id: true,
      title: true,
      body: true,
      priority: true,
      status: true,
      assigned_to: true,
      tenant_id: true,
      created_at: true,
      tenant: { select: { name: true } },
      _count: { select: { replies: true } },
    },
  });

  const triaged = tickets.map((t) => {
    const ageH = (now - new Date(t.created_at).getTime()) / 3_600_000;
    const text = `${t.title} ${t.body}`;
    const severity = sevFromTicket(t.priority, ageH, text);
    const product = routeProduct(t.tenant_id, text);
    const sla = slaRisk(severity, ageH);
    const awaitingFirstReply = t._count.replies === 0;
    return {
      id: t.id,
      title: t.title,
      customerName: t.tenant?.name ?? null,
      ageHours: Math.round(ageH),
      assigned: !!t.assigned_to,
      awaitingFirstReply,
      severity,
      product,
      slaRisk: sla,
      suggestedReply: suggestedReply(
        severity,
        product,
        t.tenant?.name ?? "",
      ),
    };
  });

  triaged.sort((a, b) => {
    const s = SEV_RANK[a.severity] - SEV_RANK[b.severity];
    if (s !== 0) return s;
    const slaOrder = { breached: 0, at_risk: 1, ok: 2 };
    return slaOrder[a.slaRisk] - slaOrder[b.slaRisk];
  });

  const summary = {
    total: triaged.length,
    critical: triaged.filter((t) => t.severity === "critical").length,
    breached: triaged.filter((t) => t.slaRisk === "breached").length,
    awaitingFirstReply: triaged.filter((t) => t.awaitingFirstReply).length,
  };

  return NextResponse.json({ summary, tickets: triaged.slice(0, 50) });
}

export const GET = withGuard("endur-ai-ticket-triage", GET_);
