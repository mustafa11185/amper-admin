export const dynamic = "force-dynamic";
import { MapPin } from "lucide-react";
import PlaceholderTab from "../_components/PlaceholderTab";

export default function RestoIqBranchesPage() {
  return (
    <PlaceholderTab
      Icon={MapPin}
      eyebrow="BRANCHES · CROSS-TENANT"
      title="الفروع — انتشار جغرافي عبر كل المطاعم"
      intro="رؤية موحّدة لكل فروع المطاعم المشتركة في RestoIQ. مفيد لقرارات التوسّع وتحديد المدن النامية."
      endpoint="/saas/branches"
      previewBullets={[
        "خريطة عراق (Heatmap) لكثافة الفروع حسب المحافظة",
        "ترتيب أعلى ١٠ مدن من حيث عدد المطاعم النشطة",
        "متوسّط عدد الفروع لكل مطعم",
        "تنبيهات لمطاعم لم تفتح فرعها الأوّل بعد ٣٠ يوم من التسجيل",
      ]}
    />
  );
}
