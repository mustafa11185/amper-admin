"use client";

import { Settings } from "lucide-react";

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <section
        className="rounded-2xl p-6"
        style={{
          background: "var(--bg-surface)",
          boxShadow: "var(--shadow-md)",
        }}
      >
        <div className="flex items-center gap-2 mb-6">
          <Settings size={22} style={{ color: "var(--blue-primary)" }} />
          <h2
            className="text-lg font-bold"
            style={{ color: "var(--text-primary)" }}
          >
            الإعدادات
          </h2>
        </div>

        <div className="flex flex-col items-center justify-center py-16">
          <Settings
            size={48}
            style={{ color: "var(--text-muted)", opacity: 0.3 }}
          />
          <p
            className="text-lg font-medium mt-4"
            style={{ color: "var(--text-muted)" }}
          >
            قريبًا...
          </p>
          <p
            className="text-sm mt-1"
            style={{ color: "var(--text-muted)", opacity: 0.7 }}
          >
            سيتم إضافة إعدادات النظام قريبًا
          </p>
        </div>
      </section>
    </div>
  );
}
