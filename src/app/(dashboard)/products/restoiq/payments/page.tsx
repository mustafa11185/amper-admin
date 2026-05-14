export const dynamic = "force-dynamic";
import { CreditCard } from "lucide-react";
import PlaceholderTab from "../_components/PlaceholderTab";

export default function RestoIqPaymentsPage() {
  return (
    <PlaceholderTab
      Icon={CreditCard}
      eyebrow="PAYMENTS · PLATFORM HEALTH"
      title="المدفوعات — صحّة منصّة الدفع"
      intro="نظرة على حركة الدفع عبر كل المطاعم: المنصّات الخارجيّة، التسويات، ومدفوعات الاشتراك المتأخّرة."
      endpoint="/saas/payments/health"
      previewBullets={[
        "إجمالي عمولة طلبات/كريم/ليزو/توترز عبر كل المطاعم",
        "تسويات معلّقة (واجبة الدفع للمطاعم) + المُجدوَلة",
        "مدفوعات الاشتراك المتأخّرة (مطاعم اقتربت من قطع الخدمة)",
        "متوسّط الفترة بين الفاتورة والدفع",
        "تنبيهات gateway: ZainCash · Qi · AsiaPay — رفض ومحاولات",
      ]}
    />
  );
}
