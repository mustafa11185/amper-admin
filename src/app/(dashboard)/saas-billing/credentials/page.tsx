"use client";
export const dynamic = 'force-dynamic';

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Lock, Loader2, RefreshCw, ArrowLeft, AlertTriangle, CheckCircle2,
  Eye, EyeOff, Save, Trash2, Zap, FlaskConical,
} from "lucide-react";
import toast from "react-hot-toast";

type Gateway = 'zaincash' | 'qi' | 'asiapay';
type Source = 'db' | 'env' | 'none';

interface CredItem {
  gateway: Gateway;
  label: string;
  source: Source;
  is_test_mode: boolean;
  is_enabled: boolean;
  display_name: string | null;
  last_validated_at: string | null;
  last_validation_error: string | null;
  updated_at: string | null;
}

const GATEWAY_FIELDS: Record<Gateway, { key: string; label: string; secret: boolean; hint?: string }[]> = {
  zaincash: [
    { key: 'client_id', label: 'Client ID', secret: false },
    { key: 'client_secret', label: 'Client Secret', secret: true },
    { key: 'api_key', label: 'API Key (HS256)', secret: true, hint: 'يُستخدم لتوقيع JWT' },
    { key: 'service_type', label: 'Service Type', secret: false, hint: 'مثلاً: AMPER_SAAS' },
    { key: 'msisdn', label: 'MSISDN (اختياري)', secret: false, hint: 'رقم التاجر — للعرض فقط' },
  ],
  qi: [
    { key: 'username', label: 'Username', secret: false },
    { key: 'password', label: 'Password', secret: true },
    { key: 'terminal_id', label: 'Terminal ID', secret: false, hint: 'X-Terminal-Id' },
  ],
  asiapay: [
    { key: 'app_id', label: 'App ID', secret: false },
    { key: 'app_key', label: 'App Key', secret: true },
    { key: 'app_secret', label: 'App Secret', secret: true },
    { key: 'private_key', label: 'Private Key', secret: true, hint: 'PEM format' },
    { key: 'merchant_code', label: 'Merchant Code', secret: false },
    { key: 'domain_url', label: 'Domain URL', secret: false },
  ],
};

const GATEWAY_EMOJI: Record<Gateway, string> = {
  zaincash: '🟣',
  qi: '💳',
  asiapay: '🏦',
};

export default function CredentialsPage() {
  const [items, setItems] = useState<CredItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Gateway | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch('/api/saas-billing/credentials');
      const d = await r.json();
      if (r.ok) setItems(d.items);
      else toast.error(d.error || 'فشل التحميل');
    } catch (err) {
      toast.error('فشل الاتصال');
      console.error(err);
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const onSaved = async () => {
    setEditing(null);
    await load();
    toast.success('تم الحفظ');
  };

  return (
    <div className="p-6 max-w-screen-xl mx-auto" dir="rtl">
      <Link href="/saas-billing" className="inline-flex items-center gap-1 text-sm text-blue-600 hover:underline mb-4">
        <ArrowLeft className="w-4 h-4" />
        رجوع إلى إدارة الاشتراكات
      </Link>

      <div className="flex items-center gap-3 mb-2">
        <Lock className="w-7 h-7 text-blue-600" />
        <h1 className="text-2xl font-bold text-gray-900">حسابات الدفع — Amper</h1>
      </div>
      <p className="text-sm text-gray-500 mb-8">
        حساب الـ merchant الخاص بـ Amper اللي يستلم اشتراكات العملاء (مختلف عن حسابات الـ tenants).
        البيانات مشفّرة بـ AES-256 ولا تُعرض كنص واضح بعد الحفظ.
      </p>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-gray-400" /></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {items.map((item) => (
            <GatewayCard
              key={item.gateway}
              item={item}
              onEdit={() => setEditing(item.gateway)}
              onTest={async () => {
                const t = toast.loading('جاري الفحص...');
                const r = await fetch(`/api/saas-billing/credentials/${item.gateway}/test`, { method: 'POST' });
                const d = await r.json().catch(() => ({}));
                toast.dismiss(t);
                if (d.ok) toast.success('نجح الاتصال ✅');
                else toast.error(`فشل: ${d.message || d.error}`);
                load();
              }}
              onDelete={async () => {
                if (!confirm(`حذف credentials ${item.label}؟ سيرجع للـ env vars إذا موجودة.`)) return;
                const r = await fetch(`/api/saas-billing/credentials/${item.gateway}`, { method: 'DELETE' });
                if (r.ok) { toast.success('تم الحذف'); load(); }
                else toast.error('فشل الحذف');
              }}
            />
          ))}
        </div>
      )}

      <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm">
        <div className="flex items-start gap-2">
          <AlertTriangle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="text-blue-900">
            <strong className="block mb-1">ملاحظات أمنية</strong>
            <ul className="list-disc pr-4 space-y-1 text-blue-800">
              <li>البيانات مُشفّرة بمفتاح <code className="font-mono text-xs">PAYMENTS_ENCRYPTION_KEY</code>. تدوير المفتاح يُلغي كل البيانات المخزّنة.</li>
              <li>تغيير الـ credentials لا يحتاج deploy — يأخذ مفعول مباشرة في الـ checkouts الجديدة.</li>
              <li>عند فشل قراءة الـ DB، النظام يرجع تلقائياً للـ env vars (إذا موجودة).</li>
              <li>زر "اختبار" يستدعي manager-app الـ adapter ويحاول auth-only probe بدون إنشاء معاملة.</li>
            </ul>
          </div>
        </div>
      </div>

      {editing && (
        <CredentialsModal
          gateway={editing}
          existing={items.find((i) => i.gateway === editing)!}
          onClose={() => setEditing(null)}
          onSaved={onSaved}
        />
      )}
    </div>
  );
}

function GatewayCard({ item, onEdit, onTest, onDelete }: {
  item: CredItem;
  onEdit: () => void;
  onTest: () => void;
  onDelete: () => void;
}) {
  const sourceColor: Record<Source, string> = {
    db: 'bg-green-100 text-green-700 border-green-200',
    env: 'bg-amber-100 text-amber-700 border-amber-200',
    none: 'bg-red-100 text-red-700 border-red-200',
  };
  const sourceLabel: Record<Source, string> = {
    db: 'مخزّن (DB)',
    env: 'env vars',
    none: 'غير مُعد',
  };

  return (
    <div className="bg-white rounded-2xl border p-5 flex flex-col">
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="text-3xl mb-1">{GATEWAY_EMOJI[item.gateway]}</div>
          <h3 className="text-lg font-bold">{item.label}</h3>
          {item.display_name && <p className="text-xs text-gray-500 mt-0.5">{item.display_name}</p>}
        </div>
        <span className={`text-xs px-2 py-1 rounded-full border ${sourceColor[item.source]}`}>
          {sourceLabel[item.source]}
        </span>
      </div>

      <div className="space-y-2 text-sm flex-1">
        {item.source !== 'none' && (
          <div className="flex items-center gap-2 text-xs">
            <span className="text-gray-500">الوضع:</span>
            <span className={item.is_test_mode ? 'text-amber-600 font-semibold' : 'text-green-600 font-semibold'}>
              {item.is_test_mode ? '🧪 Test' : '🟢 Live'}
            </span>
            {!item.is_enabled && <span className="text-red-600 text-xs">· معطّل</span>}
          </div>
        )}
        {item.last_validated_at && (
          <div className="flex items-center gap-2 text-xs text-green-600">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>اختبار ناجح: {new Date(item.last_validated_at).toLocaleDateString('ar-IQ')}</span>
          </div>
        )}
        {item.last_validation_error && (
          <div className="flex items-start gap-2 text-xs text-red-600">
            <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
            <span className="break-words">{item.last_validation_error.slice(0, 100)}</span>
          </div>
        )}
        {item.source === 'none' && (
          <p className="text-xs text-gray-400 italic">لم تُعد بيانات لهذه البوابة بعد.</p>
        )}
        {item.source === 'env' && (
          <p className="text-xs text-amber-700">⚠️ تستخدم env vars حالياً. احفظ من هنا لتعديل بدون deploy.</p>
        )}
      </div>

      <div className="grid grid-cols-3 gap-2 mt-4">
        <button onClick={onEdit} className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg py-2 text-sm font-medium flex items-center justify-center gap-1">
          <Save className="w-3.5 h-3.5" />
          تعديل
        </button>
        <button
          onClick={onTest}
          disabled={item.source === 'none'}
          className="border rounded-lg py-2 text-sm font-medium flex items-center justify-center gap-1 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <FlaskConical className="w-3.5 h-3.5" />
          اختبار
        </button>
        <button
          onClick={onDelete}
          disabled={item.source !== 'db'}
          className="border border-red-200 text-red-600 rounded-lg py-2 text-sm font-medium flex items-center justify-center gap-1 hover:bg-red-50 disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <Trash2 className="w-3.5 h-3.5" />
          حذف
        </button>
      </div>
    </div>
  );
}

function CredentialsModal({
  gateway, existing, onClose, onSaved,
}: {
  gateway: Gateway;
  existing: CredItem;
  onClose: () => void;
  onSaved: () => void;
}) {
  const fields = GATEWAY_FIELDS[gateway];
  const [values, setValues] = useState<Record<string, string>>(() =>
    fields.reduce((acc, f) => ({ ...acc, [f.key]: '' }), {})
  );
  const [shown, setShown] = useState<Record<string, boolean>>({});
  const [isTestMode, setIsTestMode] = useState(existing.is_test_mode ?? true);
  const [isEnabled, setIsEnabled] = useState(existing.is_enabled ?? true);
  const [displayName, setDisplayName] = useState(existing.display_name ?? '');
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    const required = GATEWAY_FIELDS[gateway].filter((f) => !f.label.includes('اختياري')).map((f) => f.key);
    const missing = required.filter((f) => !values[f] || values[f].trim() === '');
    if (missing.length > 0) {
      toast.error(`حقول مفقودة: ${missing.join(', ')}`);
      return;
    }
    setSubmitting(true);
    try {
      const r = await fetch(`/api/saas-billing/credentials/${gateway}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          credentials: values,
          is_test_mode: isTestMode,
          is_enabled: isEnabled,
          display_name: displayName || undefined,
        }),
      });
      const d = await r.json();
      if (!r.ok) {
        toast.error(d.error === 'MISSING_FIELDS' ? `حقول مفقودة: ${(d.fields || []).join(', ')}` : d.error || 'فشل الحفظ');
        setSubmitting(false);
        return;
      }
      onSaved();
    } catch (err) {
      toast.error('فشل الحفظ');
      console.error(err);
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
          <h2 className="text-lg font-bold">
            {GATEWAY_EMOJI[gateway]} {existing.label} — credentials
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 text-xl leading-none">×</button>
        </div>

        <div className="p-6 space-y-4">
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-800 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>
              {existing.source === 'db' && 'القيم القديمة لن تُعرض. أدخل الكل من جديد.'}
              {existing.source === 'env' && 'هذه القيم ستُحفظ بالـ DB وتطغى على env vars.'}
              {existing.source === 'none' && 'إعداد جديد. خذ الـ credentials من لوحة الـ merchant.'}
            </span>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">اسم العرض (اختياري)</label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="مثلاً: ZainCash · حساب أمبير الرئيسي"
              className="w-full border rounded-lg px-3 py-2 text-sm"
            />
          </div>

          {fields.map((f) => (
            <div key={f.key}>
              <label className="block text-sm font-medium mb-1">
                {f.label}
                {f.hint && <span className="text-xs text-gray-400 mr-2">— {f.hint}</span>}
              </label>
              <div className="relative">
                <input
                  type={f.secret && !shown[f.key] ? 'password' : 'text'}
                  value={values[f.key]}
                  onChange={(e) => setValues({ ...values, [f.key]: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 text-sm font-mono pl-10"
                  dir="ltr"
                />
                {f.secret && (
                  <button
                    type="button"
                    onClick={() => setShown({ ...shown, [f.key]: !shown[f.key] })}
                    className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700"
                  >
                    {shown[f.key] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                )}
              </div>
            </div>
          ))}

          <div className="flex gap-4 pt-2">
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" checked={isTestMode} onChange={(e) => setIsTestMode(e.target.checked)} />
              <span>وضع الاختبار (UAT)</span>
            </label>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" checked={isEnabled} onChange={(e) => setIsEnabled(e.target.checked)} />
              <span>مُفعّل</span>
            </label>
          </div>
        </div>

        <div className="sticky bottom-0 bg-white border-t px-6 py-4 flex gap-2">
          <button onClick={onClose} className="flex-1 border rounded-lg py-2 hover:bg-gray-50">إلغاء</button>
          <button
            onClick={submit}
            disabled={submitting}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg py-2 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Save className="w-4 h-4" /> حفظ</>}
          </button>
        </div>
      </div>
    </div>
  );
}
