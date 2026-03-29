"use client";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div
      style={{
        minHeight: "60vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 16,
        padding: 40,
        textAlign: "center",
      }}
    >
      <div
        style={{
          width: 64,
          height: 64,
          borderRadius: 16,
          background: "#FEE2E2",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 28,
        }}
      >
        ⚠️
      </div>
      <h2
        style={{
          fontSize: 20,
          fontWeight: 700,
          color: "var(--text-primary)",
          margin: 0,
        }}
      >
        حدث خطأ غير متوقع
      </h2>
      <p style={{ fontSize: 14, color: "var(--text-muted)", margin: 0 }}>
        {error.message || "فشل تحميل الصفحة"}
      </p>
      <button
        onClick={reset}
        style={{
          padding: "10px 24px",
          borderRadius: 10,
          border: "none",
          background: "var(--blue-primary, #1B4FD8)",
          color: "#FFF",
          fontSize: 14,
          fontWeight: 600,
          cursor: "pointer",
        }}
      >
        إعادة المحاولة
      </button>
    </div>
  );
}
