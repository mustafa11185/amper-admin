export const dynamic = "force-dynamic";
import { MessageCircle } from "lucide-react";
import PlaceholderTab from "../_components/PlaceholderTab";

export default function RestoIqWhatsappPage() {
  return (
    <PlaceholderTab
      Icon={MessageCircle}
      eyebrow="WHATSAPP · PLATFORM USAGE"
      title="WhatsApp — استخدام عبر المنصّة"
      intro="WhatsApp هو القناة الأهمّ في السوق العراقي. هذا القسم يجمّع استخدام كل المطاعم لمعرفة التكلفة الكلّيّة ومعدّلات التسليم."
      endpoint="/saas/whatsapp/usage"
      previewBullets={[
        "إجمالي رسائل WhatsApp مُرسَلة عبر المنصّة هذا الشهر",
        "التكلفة الإجماليّة (مع تفصيل حسب المطعم)",
        "معدّل تسليم ناجح vs فاشل (نطاق الأرقام غير الصالحة)",
        "إنذار لمطاعم تجاوزت ميزانيّتها الشهريّة",
        "أعلى المطاعم استخداماً — قرارات pool sizing",
      ]}
    />
  );
}
