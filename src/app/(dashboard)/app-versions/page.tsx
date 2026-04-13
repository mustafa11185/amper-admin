"use client";
export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { Smartphone, Save, Check, AlertTriangle } from "lucide-react";

type AppVersion = {
  id: string;
  app_key: string;
  min_version: string;
  latest_version: string;
  update_url: string | null;
  changelog_ar: string | null;
  changelog_en: string | null;
  force: boolean;
  released_at: string;
  updated_at: string;
};

const APP_LABELS: Record<string, { ar: string; desc: string }> = {
  staff: { ar: "تطبيق الموظف", desc: "Flutter — جابي / مشغل / محاسب" },
  iot: { ar: "خدمة IoT", desc: "واجهة الكيوسك ومراقبة الأجهزة" },
  partner: { ar: "بوابة الشريك", desc: "لوحة إدارة المولدة للمالك" },
};

export default function AppVersionsPage() {
  const [versions, setVersions] = useState<AppVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [drafts, setDrafts] = useState<Record<string, Partial<AppVersion>>>({});
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [flashKey, setFlashKey] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/app-versions", { cache: "no-store" });
      const data = await res.json();
      setVersions(data.versions || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const setField = (app_key: string, field: keyof AppVersion, value: unknown) => {
    setDrafts((d) => ({
      ...d,
      [app_key]: { ...(d[app_key] || {}), [field]: value },
    }));
  };

  const getValue = (v: AppVersion, field: keyof AppVersion): string => {
    const draft = drafts[v.app_key];
    if (draft && field in draft) return String(draft[field] ?? "");
    return String(v[field] ?? "");
  };

  const getBool = (v: AppVersion, field: keyof AppVersion): boolean => {
    const draft = drafts[v.app_key];
    if (draft && field in draft) return Boolean(draft[field]);
    return Boolean(v[field]);
  };

  const save = async (v: AppVersion) => {
    const draft = drafts[v.app_key] || {};
    setSavingKey(v.app_key);
    try {
      const res = await fetch("/api/app-versions", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          app_key: v.app_key,
          min_version: draft.min_version ?? v.min_version,
          latest_version: draft.latest_version ?? v.latest_version,
          update_url: draft.update_url ?? v.update_url,
          changelog_ar: draft.changelog_ar ?? v.changelog_ar,
          changelog_en: draft.changelog_en ?? v.changelog_en,
          force: draft.force ?? v.force,
        }),
      });
      if (!res.ok) throw new Error("save failed");
      setDrafts((d) => {
        const next = { ...d };
        delete next[v.app_key];
        return next;
      });
      await load();
      setFlashKey(v.app_key);
      setTimeout(() => setFlashKey(null), 2000);
    } catch (e) {
      alert("فشل الحفظ: " + (e as Error).message);
    } finally {
      setSavingKey(null);
    }
  };

  return (
    <div className="space-y-6">
      <section
        className="rounded-2xl p-6"
        style={{ background: "var(--bg-surface)", boxShadow: "var(--shadow-md)" }}
      >
        <div className="flex items-center gap-2 mb-2">
          <Smartphone size={22} style={{ color: "var(--blue-primary)" }} />
          <h2 className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>
            إدارة إصدارات التطبيقات
          </h2>
        </div>
        <p className="text-sm mb-6" style={{ color: "var(--text-muted)" }}>
          تحكّم بالإصدار الأدنى والإصدار الحالي لكل تطبيق. المستخدمون الذين يستخدمون
          إصدارًا أدنى من الحد الأدنى سيُجبرون على التحديث.
        </p>

        {loading && (
          <div className="text-center py-12" style={{ color: "var(--text-muted)" }}>
            جاري التحميل...
          </div>
        )}

        {/* For every known app_key that has no DB row yet, render a
            placeholder card so the admin can fill it in without any
            seed SQL. The upsert PUT will create the row on first save. */}
        {!loading && (() => {
          const existingKeys = new Set(versions.map((v) => v.app_key));
          const missingKeys = Object.keys(APP_LABELS).filter((k) => !existingKeys.has(k));
          if (missingKeys.length === 0) return null;
          const placeholders: AppVersion[] = missingKeys.map((key) => ({
            id: `__new__${key}`,
            app_key: key,
            min_version: "",
            latest_version: "",
            update_url: null,
            changelog_ar: null,
            changelog_en: null,
            force: false,
            released_at: "",
            updated_at: "",
          }));
          return (
            <div className="space-y-5">
              {placeholders.map((v) => {
                const label = APP_LABELS[v.app_key] || { ar: v.app_key, desc: "" };
                const isDirty = !!drafts[v.app_key];
                const isSaving = savingKey === v.app_key;
                const flashed = flashKey === v.app_key;
                return (
                  <div
                    key={v.id}
                    className="rounded-xl p-5"
                    style={{ background: "var(--bg-base)", border: "1px solid var(--border)" }}
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <div className="font-bold text-base" style={{ color: "var(--text-primary)" }}>
                          {label.ar}
                          <span className="text-xs font-normal mr-2" style={{ color: "var(--text-muted)" }}>
                            ({v.app_key}) — جديد
                          </span>
                        </div>
                        <div className="text-xs" style={{ color: "var(--text-muted)" }}>{label.desc}</div>
                      </div>
                      {flashed && (
                        <div className="flex items-center gap-1 text-sm" style={{ color: "#10B981" }}>
                          <Check size={16} /> تم الحفظ
                        </div>
                      )}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Field label="الحد الأدنى (min_version)" value={getValue(v, "min_version")} onChange={(x) => setField(v.app_key, "min_version", x)} placeholder="2.9.0" />
                      <Field label="الإصدار الحالي (latest_version)" value={getValue(v, "latest_version")} onChange={(x) => setField(v.app_key, "latest_version", x)} placeholder="2.10.0" />
                      <div className="md:col-span-2">
                        <Field label="رابط التحديث (update_url)" value={getValue(v, "update_url")} onChange={(x) => setField(v.app_key, "update_url", x)} placeholder="https://github.com/.../releases/download/..." />
                      </div>
                      <div className="md:col-span-2">
                        <Field label="ملاحظات الإصدار (بالعربية)" value={getValue(v, "changelog_ar")} onChange={(x) => setField(v.app_key, "changelog_ar", x)} placeholder="إصلاحات أمنية + تحسينات الأداء" />
                      </div>
                      <div className="md:col-span-2">
                        <Field label="Changelog (English)" value={getValue(v, "changelog_en")} onChange={(x) => setField(v.app_key, "changelog_en", x)} placeholder="Bug fixes and improvements" />
                      </div>
                    </div>
                    <label className="flex items-center gap-2 mt-4 text-sm cursor-pointer" style={{ color: "var(--text-primary)" }}>
                      <input type="checkbox" checked={getBool(v, "force")} onChange={(e) => setField(v.app_key, "force", e.target.checked)} />
                      <AlertTriangle size={16} style={{ color: "#D97706" }} />
                      إجبار جميع المستخدمين على التحديث (تجاوز فحص الإصدار)
                    </label>
                    <div className="flex justify-end mt-4">
                      <button
                        onClick={() => save(v)}
                        disabled={!isDirty || isSaving}
                        className="flex items-center gap-2 px-5 py-2 rounded-lg font-bold text-sm transition-opacity"
                        style={{
                          background: isDirty ? "linear-gradient(135deg, #1B4FD8, #7C3AED)" : "var(--bg-elevated)",
                          color: isDirty ? "white" : "var(--text-muted)",
                          opacity: isSaving ? 0.6 : 1,
                          cursor: isDirty && !isSaving ? "pointer" : "not-allowed",
                        }}
                      >
                        <Save size={16} />
                        {isSaving ? "جاري الحفظ..." : "إنشاء وحفظ"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })()}

        <div className="space-y-5">
          {versions.map((v) => {
            const label = APP_LABELS[v.app_key] || { ar: v.app_key, desc: "" };
            const isDirty = !!drafts[v.app_key];
            const isSaving = savingKey === v.app_key;
            const flashed = flashKey === v.app_key;

            return (
              <div
                key={v.id}
                className="rounded-xl p-5"
                style={{
                  background: "var(--bg-base)",
                  border: "1px solid var(--border)",
                }}
              >
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <div
                      className="font-bold text-base"
                      style={{ color: "var(--text-primary)" }}
                    >
                      {label.ar}
                      <span
                        className="text-xs font-normal mr-2"
                        style={{ color: "var(--text-muted)" }}
                      >
                        ({v.app_key})
                      </span>
                    </div>
                    <div className="text-xs" style={{ color: "var(--text-muted)" }}>
                      {label.desc}
                    </div>
                  </div>
                  {flashed && (
                    <div
                      className="flex items-center gap-1 text-sm"
                      style={{ color: "#10B981" }}
                    >
                      <Check size={16} /> تم الحفظ
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Field
                    label="الحد الأدنى (min_version)"
                    value={getValue(v, "min_version")}
                    onChange={(x) => setField(v.app_key, "min_version", x)}
                    placeholder="2.6.0"
                  />
                  <Field
                    label="الإصدار الحالي (latest_version)"
                    value={getValue(v, "latest_version")}
                    onChange={(x) => setField(v.app_key, "latest_version", x)}
                    placeholder="2.7.0"
                  />
                  <div className="md:col-span-2">
                    <Field
                      label="رابط التحديث (update_url)"
                      value={getValue(v, "update_url")}
                      onChange={(x) => setField(v.app_key, "update_url", x)}
                      placeholder="https://..."
                    />
                  </div>
                  <div className="md:col-span-2">
                    <Field
                      label="ملاحظات الإصدار (بالعربية)"
                      value={getValue(v, "changelog_ar")}
                      onChange={(x) => setField(v.app_key, "changelog_ar", x)}
                      placeholder="إصلاحات أمنية + تحسينات الأداء"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <Field
                      label="Changelog (English)"
                      value={getValue(v, "changelog_en")}
                      onChange={(x) => setField(v.app_key, "changelog_en", x)}
                      placeholder="Bug fixes and improvements"
                    />
                  </div>
                </div>

                <label
                  className="flex items-center gap-2 mt-4 text-sm cursor-pointer"
                  style={{ color: "var(--text-primary)" }}
                >
                  <input
                    type="checkbox"
                    checked={getBool(v, "force")}
                    onChange={(e) => setField(v.app_key, "force", e.target.checked)}
                  />
                  <AlertTriangle size={16} style={{ color: "#D97706" }} />
                  إجبار جميع المستخدمين على التحديث (تجاوز فحص الإصدار)
                </label>

                <div className="flex justify-end mt-4">
                  <button
                    onClick={() => save(v)}
                    disabled={!isDirty || isSaving}
                    className="flex items-center gap-2 px-5 py-2 rounded-lg font-bold text-sm transition-opacity"
                    style={{
                      background: isDirty
                        ? "linear-gradient(135deg, #1B4FD8, #7C3AED)"
                        : "var(--bg-elevated)",
                      color: isDirty ? "white" : "var(--text-muted)",
                      opacity: isSaving ? 0.6 : 1,
                      cursor: isDirty && !isSaving ? "pointer" : "not-allowed",
                    }}
                  >
                    <Save size={16} />
                    {isSaving ? "جاري الحفظ..." : "حفظ"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div>
      <label
        className="block text-xs font-bold mb-1"
        style={{ color: "var(--text-muted)" }}
      >
        {label}
      </label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-3 py-2 rounded-lg text-sm"
        style={{
          background: "var(--bg-surface)",
          border: "1px solid var(--border)",
          color: "var(--text-primary)",
        }}
      />
    </div>
  );
}
