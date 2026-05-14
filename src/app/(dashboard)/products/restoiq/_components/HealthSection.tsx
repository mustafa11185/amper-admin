import { AlertTriangle } from "lucide-react";
import PlaceholderTab from "./PlaceholderTab";

export default function HealthSection() {
  return (
    <PlaceholderTab
      Icon={AlertTriangle}
      eyebrow="PLATFORM HEALTH"
      title="صحّة المنصّة — تنبيهات وأخطاء"
      intro="رؤية موحّدة لكل ما يمكن أن ينقص أداء RestoIQ: أخطاء API، تأخّر backend، مشاكل المزامنة بين الكاشير والـ web."
      endpoint="/saas/health"
      previewBullets={[
        "Uptime آخر ٣٠ يوم — مع تفصيل كل تعطّل",
        "أعلى ١٠ أخطاء API هذا الأسبوع",
        "مطاعم عندها sync conflicts (يربط مع /sync-conflicts الموجود)",
        "p95 و p99 لأوقات استجابة backend",
        "تنبيهات realtime: WebSocket disconnect storms, DB connection pool",
      ]}
    />
  );
}
