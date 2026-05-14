import { BarChart3 } from "lucide-react";
import PlaceholderTab from "./PlaceholderTab";

export default function ReportsSection() {
  return (
    <PlaceholderTab
      Icon={BarChart3}
      eyebrow="REPORTS · PLATFORM-WIDE"
      title="التقارير الموحّدة — كل المطاعم في تقرير واحد"
      intro="تقارير مجمَّعة عبر كل المطاعم تظهر صحّة المنصّة وفرص النمو. مختلفة عن تقارير المدير التي تخصّ مطعماً واحداً."
      endpoint="/saas/reports/platform"
      previewBullets={[
        "أعلى ١٠ مطاعم إيراداً هذا الشهر",
        "نموّ MRR شهرياً — مع تنبؤ بنمط آخر ٣ أشهر",
        "ساعات الذروة عبر المنصّة (يوم × ساعة)",
        "معدّل التحويل من تجريبي → مدفوع",
        "Churn rate شهرياً + سبب الإلغاء الأبرز",
      ]}
    />
  );
}
