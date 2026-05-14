/**
 * PlaceholderTab — shared shell for the 7 tabs that aren't wired to
 * data yet (Branches / Reports / Marketplace / Payments / WhatsApp /
 * Health / Tickets). Each tab passes its own icon + headline +
 * preview bullets so the admin knows what to expect after P-MERGE-3.
 */
import type { LucideIcon } from "lucide-react";
import { Wrench } from "lucide-react";

export default function PlaceholderTab({
  Icon,
  eyebrow,
  title,
  intro,
  endpoint,
  previewBullets,
}: {
  Icon: LucideIcon;
  eyebrow: string;
  title: string;
  intro: string;
  endpoint?: string;
  previewBullets: string[];
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Hero card */}
      <div
        style={{
          background:
            "linear-gradient(135deg, var(--blue-soft) 0%, #DBEAFE 100%)",
          border: "1px solid var(--border)",
          borderRadius: 16,
          padding: "24px 28px",
          display: "flex",
          gap: 18,
          alignItems: "flex-start",
        }}
      >
        <div style={{ paddingTop: 4 }}>
          <Icon size={32} color="var(--blue-primary)" />
        </div>
        <div style={{ flex: 1 }}>
          <p
            style={{
              fontSize: 11,
              fontWeight: 800,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: "var(--blue-primary)",
              marginBottom: 6,
              fontFamily: "var(--font-jetbrains-mono)",
            }}
          >
            {eyebrow}
          </p>
          <h2
            style={{
              fontSize: 20,
              fontWeight: 800,
              color: "var(--text-primary)",
              marginBottom: 8,
            }}
          >
            {title}
          </h2>
          <p
            style={{
              fontSize: 13,
              color: "var(--text-secondary)",
              lineHeight: 1.7,
              maxWidth: 720,
            }}
          >
            {intro}
          </p>
        </div>
      </div>

      {/* Pending notice */}
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
          size={32}
          color="var(--text-muted)"
          style={{ display: "block", margin: "0 auto 12px" }}
        />
        <h3
          style={{
            fontSize: 15,
            fontWeight: 700,
            color: "var(--text-primary)",
            marginBottom: 6,
          }}
        >
          بانتظار wire-up مع backend
        </h3>
        <p
          style={{
            fontSize: 13,
            color: "var(--text-muted)",
            lineHeight: 1.7,
            maxWidth: 540,
            margin: "0 auto 14px",
          }}
        >
          هذا القسم جاهز بصرياً. ربط البيانات الحيّة يحدث في{" "}
          <b>P-MERGE-3</b>
          {endpoint && (
            <>
              {" "}— عبر endpoint{" "}
              <code
                style={{
                  padding: "2px 6px",
                  borderRadius: 4,
                  background: "var(--bg-muted)",
                  fontSize: 11,
                  fontFamily: "var(--font-jetbrains-mono)",
                }}
              >
                {endpoint}
              </code>
            </>
          )}
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
          المرحلة التالية: P-MERGE-3
        </div>
      </div>

      {/* Preview bullets */}
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
          ما سيظهر هنا بعد الربط
        </p>
        <ul
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 10,
            listStyle: "none",
            padding: 0,
            margin: 0,
          }}
        >
          {previewBullets.map((b, i) => (
            <li
              key={i}
              style={{
                padding: "12px 14px",
                borderRadius: 10,
                background: "var(--bg-muted)",
                fontSize: 12.5,
                color: "var(--text-secondary)",
                lineHeight: 1.7,
              }}
            >
              ▸ {b}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
