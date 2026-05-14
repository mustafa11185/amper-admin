import { ShoppingBag } from "lucide-react";
import PlaceholderTab from "./PlaceholderTab";

export default function MarketplaceSection() {
  return (
    <PlaceholderTab
      Icon={ShoppingBag}
      eyebrow="MARKETPLACE POLICY"
      title="سياسة الماركت بليس — لكلّ برند"
      intro="إدارة العمولات وسقف الخصومات وميزانية رسائل الواتساب لكل مطعم على حدة. يربط مع endpoint الـ RestoIQ الحالي /saas/marketplace-policy."
      endpoint="/saas/marketplace-policy/:brandId"
      previewBullets={[
        "نسبة العمولة الافتراضيّة لكل برند + قابلة للتعديل",
        "سقف الخصم المسموح للعروض (مثلاً 50%)",
        "ميزانية رسائل WhatsApp شهرياً (تحدّ تلقائي)",
        "إيقاف/إعادة تشغيل الظهور في الماركت بليس",
        "وضع الموافقة (تلقائي مقابل يدوي) لكل عرض جديد",
      ]}
    />
  );
}
