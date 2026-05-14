"use client";

/**
 * /products/restoiq/ai — P-MERGE-2 (2026-05-14).
 *
 * AI subscriptions admin for RestoIQ. The shell is ready; the live
 * wire-up to the RestoIQ backend's /saas/ai-subscriptions happens in
 * P-MERGE-3 (API proxy + HMAC signing via Product.webhook_secret).
 *
 * Until then, the screen shows a clear "API not yet wired" state so
 * the admin knows the section is intentional, not broken.
 */
export const dynamic = "force-dynamic";

import { Sparkles, Wrench, ExternalLink } from "lucide-react";

export default function RestoIqAiPage() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Hero shell — explains what's coming */}
      <div
        style={{
          background:
            "linear-gradient(135deg, #FEF3C7 0%, #FDE68A 50%, #FCD34D 100%)",
          border: "1px solid #FCD34D",
          borderRadius: 16,
          padding: "24px 28px",
          display: "flex",
          gap: 18,
          alignItems: "flex-start",
        }}
      >
        <div
          style={{
            fontSize: 32,
            lineHeight: 1,
          }}
        >
          <Sparkles size={32} color="#B45309" />
        </div>
        <div style={{ flex: 1 }}>
          <p
            style={{
              fontSize: 11,
              fontWeight: 800,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: "#92400E",
              marginBottom: 6,
              fontFamily: "var(--font-jetbrains-mono)",
            }}
          >
            RESTOIQ AI · ADMIN
          </p>
          <h2
            style={{
              fontSize: 20,
              fontWeight: 800,
              color: "#78350F",
              marginBottom: 8,
            }}
          >
            إدارة اشتراكات ذكاء RestoIQ
          </h2>
          <p
            style={{
              fontSize: 13,
              color: "#92400E",
              lineHeight: 1.7,
              maxWidth: 720,
            }}
          >
            من هنا تنشئ pools الذكاء، توزّع الحصص بين المطاعم، تتابع
            استخدام كل برند، وتفعّل/تعطّل الميزات على مستوى المنصّة.
            يُغذّى هذا القسم من backend الـ RestoIQ مباشرةً عبر API
            موقّع بـ HMAC.
          </p>
        </div>
      </div>

      {/* Pending wire-up notice */}
      <div
        style={{
          background: "var(--bg-surface)",
          border: "1px dashed var(--border)",
          borderRadius: 14,
          padding: "28px 32px",
          textAlign: "center",
        }}
      >
        <Wrench
          size={36}
          color="var(--text-muted)"
          style={{ display: "block", margin: "0 auto 14px" }}
        />
        <h3
          style={{
            fontSize: 15,
            fontWeight: 700,
            color: "var(--text-primary)",
            marginBottom: 8,
          }}
        >
          بانتظار ربط API
        </h3>
        <p
          style={{
            fontSize: 13,
            color: "var(--text-muted)",
            lineHeight: 1.7,
            maxWidth: 540,
            margin: "0 auto 16px",
          }}
        >
          هذا القسم جاهز بصرياً. الـ wire-up مع endpoint{" "}
          <code
            style={{
              padding: "2px 6px",
              borderRadius: 4,
              background: "var(--bg-muted)",
              fontSize: 11,
              fontFamily: "var(--font-jetbrains-mono)",
            }}
          >
            /saas/ai-subscriptions
          </code>{" "}
          في backend الـ RestoIQ يحدث في <b>P-MERGE-3</b> — نضبط{" "}
          <code
            style={{
              padding: "2px 6px",
              borderRadius: 4,
              background: "var(--bg-muted)",
              fontSize: 11,
              fontFamily: "var(--font-jetbrains-mono)",
            }}
          >
            Product.api_base_url
          </code>{" "}
          ونوقّع الطلبات بـ HMAC من{" "}
          <code
            style={{
              padding: "2px 6px",
              borderRadius: 4,
              background: "var(--bg-muted)",
              fontSize: 11,
              fontFamily: "var(--font-jetbrains-mono)",
            }}
          >
            Product.webhook_secret
          </code>
          .
        </p>

        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            padding: "6px 12px",
            borderRadius: 999,
            background: "var(--blue-soft)",
            color: "var(--blue-primary)",
            fontSize: 12,
            fontWeight: 600,
          }}
        >
          <span>المرحلة التالية: P-MERGE-3</span>
        </div>
      </div>

      {/* What this tab WILL show — sketch for visibility */}
      <div
        style={{
          background: "var(--bg-surface)",
          border: "1px solid var(--border)",
          borderRadius: 14,
          padding: "20px 24px",
        }}
      >
        <p
          style={{
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            color: "var(--text-muted)",
            marginBottom: 14,
            fontFamily: "var(--font-jetbrains-mono)",
          }}
        >
          ما سيظهر هنا بعد P-MERGE-3
        </p>
        <ul
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 10,
            listStyle: "none",
            padding: 0,
          }}
        >
          <PreviewItem>
            <strong>قائمة pools الذكاء</strong> — كل pool مع: الباقة (PREMIUM / PRO)
            · الحدّ الشهري · المستهلك · العملاء المرتبطون · فترة الفوترة
          </PreviewItem>
          <PreviewItem>
            <strong>إنشاء pool جديد</strong> — اختر العميل المالك، الباقة، الحدّ،
            وفترة الفوترة. يتجدّد آليّاً شهريّاً.
          </PreviewItem>
          <PreviewItem>
            <strong>توزيع الحصص</strong> — لكل pool: أضف برندات وحدّد حصّة كل برند
            من الـ pool.
          </PreviewItem>
          <PreviewItem>
            <strong>متابعة الاستخدام</strong> — تنبيهات لما يقترب pool من حدّه،
            توقّع نفاد الرصيد، أعلى المحرّكات استدعاءً.
          </PreviewItem>
          <PreviewItem>
            <strong>تحويل من BYOK لـ Pool</strong> — لما المالك يرقّي خطّته، حوّله
            مركزيّاً بنقرة.
          </PreviewItem>
        </ul>
      </div>

      {/* Temporary deep-link to the existing RestoIQ admin */}
      <a
        href="http://localhost:3000/admin/ai-subscriptions"
        target="_blank"
        rel="noopener noreferrer"
        style={{
          display: "inline-flex",
          alignSelf: "flex-start",
          alignItems: "center",
          gap: 8,
          padding: "10px 16px",
          borderRadius: 10,
          background: "var(--bg-surface)",
          border: "1px solid var(--border)",
          fontSize: 12,
          fontWeight: 700,
          color: "var(--text-secondary)",
          textDecoration: "none",
          boxShadow: "var(--shadow-sm)",
        }}
      >
        <ExternalLink size={14} />
        في الوقت الحالي: افتح RestoIQ Admin القديم
      </a>
    </div>
  );
}

function PreviewItem({ children }: { children: React.ReactNode }) {
  return (
    <li
      style={{
        padding: "12px 14px",
        borderRadius: 10,
        background: "var(--bg-muted)",
        fontSize: 12.5,
        color: "var(--text-secondary)",
        lineHeight: 1.7,
      }}
    >
      ▸ {children}
    </li>
  );
}
