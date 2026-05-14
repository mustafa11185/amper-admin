"use client";
export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Loader2, Save, Building2, Receipt, Banknote, Mail } from "lucide-react";

interface CompanySettings {
  id: string;
  name_ar: string;
  name_en: string;
  short_name_ar: string;
  short_name_en: string;
  tagline_ar: string | null;
  tagline_en: string | null;
  registration_no: string | null;
  tax_id: string | null;
  address_ar: string | null;
  address_en: string | null;
  city: string;
  country: string;
  phone: string | null;
  email: string | null;
  website: string | null;
  logo_url: string | null;
  signature_url: string | null;
  invoice_prefix: string;
  invoice_next_seq: number;
  bank_name: string | null;
  bank_account_no: string | null;
  bank_iban: string | null;
  bank_swift: string | null;
  invoice_footer_ar: string | null;
  invoice_footer_en: string | null;
}

export default function CompanySettingsPage() {
  const [settings, setSettings] = useState<CompanySettings | null>(null);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState<Partial<CompanySettings>>({});

  useEffect(() => {
    fetch("/api/company-settings")
      .then((r) => r.json())
      .then((d) => {
        if (d.settings) {
          setSettings(d.settings);
          setDraft(d.settings);
        }
      });
  }, []);

  async function save() {
    setSaving(true);
    try {
      const res = await fetch("/api/company-settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      });
      const d = await res.json();
      if (d.error) {
        toast.error(d.error);
      } else {
        setSettings(d.settings);
        toast.success("تم حفظ بيانات الشركة");
      }
    } catch (e) {
      toast.error(String(e));
    } finally {
      setSaving(false);
    }
  }

  if (!settings) {
    return (
      <div style={{ padding: 32, display: "flex", justifyContent: "center" }}>
        <Loader2
          size={32}
          color="var(--blue-primary)"
          style={{ animation: "spin 1s linear infinite" }}
        />
      </div>
    );
  }

  function field<K extends keyof CompanySettings>(key: K) {
    return {
      value: (draft[key] ?? "") as string,
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
        setDraft((d) => ({ ...d, [key]: e.target.value || null })),
    };
  }

  return (
    <div style={{ padding: "32px 32px 64px", maxWidth: 1000, margin: "0 auto" }}>
      <div style={{ marginBottom: 28 }}>
        <h1
          style={{
            fontSize: 26,
            fontWeight: 800,
            color: "var(--text-primary)",
            marginBottom: 6,
          }}
        >
          بيانات شركة اندر
        </h1>
        <p style={{ fontSize: 14, color: "var(--text-muted)" }}>
          هذه البيانات تظهر على كل الفواتير والتقارير والعقود. عدّلها بدقة.
        </p>
      </div>

      <Section title="المعلومات الرسمية" icon={<Building2 size={18} />}>
        <Grid2>
          <Input
            label="الاسم الرسمي (AR)"
            help="مثل ما هو في الإجازة"
            {...field("name_ar")}
          />
          <Input label="Name (EN)" {...field("name_en")} />
          <Input label="الاختصار (AR)" {...field("short_name_ar")} />
          <Input label="Short (EN)" {...field("short_name_en")} />
          <Input
            label="رقم تسجيل الشركة"
            mono
            {...field("registration_no")}
          />
          <Input label="الرقم الضريبي (TIN)" mono {...field("tax_id")} />
        </Grid2>
        <Grid2>
          <Input label="التاجلاين (AR)" {...field("tagline_ar")} />
          <Input label="Tagline (EN)" {...field("tagline_en")} />
        </Grid2>
      </Section>

      <Section title="التواصل والعنوان" icon={<Mail size={18} />}>
        <Grid2>
          <Input label="العنوان (AR)" {...field("address_ar")} />
          <Input label="Address (EN)" {...field("address_en")} />
          <Input label="المدينة" {...field("city")} />
          <Input label="الدولة" {...field("country")} />
          <Input label="رقم الهاتف" mono {...field("phone")} />
          <Input label="البريد الإلكتروني" mono {...field("email")} />
          <Input label="الموقع الإلكتروني" mono {...field("website")} />
        </Grid2>
      </Section>

      <Section title="إعدادات الفواتير" icon={<Receipt size={18} />}>
        <Grid2>
          <Input
            label="بادئة رقم الفاتورة"
            mono
            {...field("invoice_prefix")}
            help={`مثال: ${draft.invoice_prefix || "END"}-2026-00001`}
          />
          <ReadOnly
            label="الرقم التالي"
            value={String(settings.invoice_next_seq)}
            help="يزيد تلقائياً مع كل فاتورة جديدة"
          />
        </Grid2>
        <Textarea
          label="ذيل الفاتورة (AR)"
          help="نص يظهر أسفل كل فاتورة"
          {...field("invoice_footer_ar")}
        />
        <Textarea
          label="Invoice footer (EN)"
          {...field("invoice_footer_en")}
        />
      </Section>

      <Section title="معلومات البنك" icon={<Banknote size={18} />}>
        <Grid2>
          <Input label="اسم البنك" {...field("bank_name")} />
          <Input label="رقم الحساب" mono {...field("bank_account_no")} />
          <Input label="IBAN" mono {...field("bank_iban")} />
          <Input label="SWIFT" mono {...field("bank_swift")} />
        </Grid2>
      </Section>

      {/* Sticky save bar */}
      <div
        style={{
          position: "sticky",
          bottom: 0,
          marginTop: 32,
          padding: "16px 0",
          background:
            "linear-gradient(to top, var(--bg-base) 70%, transparent)",
          display: "flex",
          justifyContent: "flex-end",
          gap: 12,
        }}
      >
        <button
          onClick={() => setDraft(settings)}
          disabled={saving}
          style={{
            padding: "10px 20px",
            borderRadius: 12,
            border: "1px solid var(--border)",
            background: "var(--bg-surface)",
            color: "var(--text-secondary)",
            fontFamily: "var(--font-cairo), var(--font-tajawal)",
            fontSize: 14,
            fontWeight: 500,
            cursor: saving ? "not-allowed" : "pointer",
          }}
        >
          إعادة تعيين
        </button>
        <button
          onClick={save}
          disabled={saving}
          style={{
            padding: "10px 24px",
            borderRadius: 12,
            border: "none",
            background: "var(--brand-teal)",
            color: "#fff",
            fontFamily: "var(--font-cairo), var(--font-tajawal)",
            fontSize: 14,
            fontWeight: 600,
            cursor: saving ? "not-allowed" : "pointer",
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          {saving ? (
            <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} />
          ) : (
            <Save size={16} />
          )}
          حفظ التغييرات
        </button>
      </div>
    </div>
  );
}

// ─── Form components ──────────────────────────────────────────────

function Section({
  title,
  icon,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section
      style={{
        background: "var(--bg-surface)",
        border: "1px solid var(--border)",
        borderRadius: 16,
        padding: 24,
        marginBottom: 18,
      }}
    >
      <h2
        style={{
          fontSize: 16,
          fontWeight: 700,
          color: "var(--text-primary)",
          marginBottom: 18,
          display: "flex",
          alignItems: "center",
          gap: 8,
        }}
      >
        <span style={{ color: "var(--brand-teal)" }}>{icon}</span>
        {title}
      </h2>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {children}
      </div>
    </section>
  );
}

function Grid2({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
        gap: 14,
      }}
    >
      {children}
    </div>
  );
}

interface InputProps {
  label: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  mono?: boolean;
  help?: string;
}

function Input({ label, value, onChange, mono, help }: InputProps) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 5 }}>
      <span
        style={{
          fontSize: 12,
          fontWeight: 600,
          color: "var(--text-secondary)",
        }}
      >
        {label}
      </span>
      <input
        value={value}
        onChange={onChange}
        dir={mono ? "ltr" : undefined}
        style={{
          padding: "9px 12px",
          borderRadius: 10,
          border: "1px solid var(--border)",
          background: "var(--bg-surface)",
          color: "var(--text-primary)",
          fontSize: 14,
          fontFamily: mono
            ? "var(--font-jetbrains-mono)"
            : "var(--font-cairo), var(--font-tajawal)",
          outline: "none",
        }}
      />
      {help && (
        <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{help}</span>
      )}
    </label>
  );
}

function Textarea({
  label,
  value,
  onChange,
  help,
}: {
  label: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  help?: string;
}) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 5 }}>
      <span
        style={{
          fontSize: 12,
          fontWeight: 600,
          color: "var(--text-secondary)",
        }}
      >
        {label}
      </span>
      <textarea
        value={value}
        onChange={onChange}
        rows={2}
        style={{
          padding: "9px 12px",
          borderRadius: 10,
          border: "1px solid var(--border)",
          background: "var(--bg-surface)",
          color: "var(--text-primary)",
          fontSize: 14,
          fontFamily: "var(--font-cairo), var(--font-tajawal)",
          outline: "none",
          resize: "vertical",
        }}
      />
      {help && (
        <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{help}</span>
      )}
    </label>
  );
}

function ReadOnly({
  label,
  value,
  help,
}: {
  label: string;
  value: string;
  help?: string;
}) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 5 }}>
      <span
        style={{
          fontSize: 12,
          fontWeight: 600,
          color: "var(--text-secondary)",
        }}
      >
        {label}
      </span>
      <div
        style={{
          padding: "9px 12px",
          borderRadius: 10,
          border: "1px dashed var(--border)",
          background: "var(--bg-muted)",
          color: "var(--text-muted)",
          fontSize: 14,
          fontFamily: "var(--font-jetbrains-mono)",
        }}
      >
        {value}
      </div>
      {help && (
        <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{help}</span>
      )}
    </label>
  );
}
