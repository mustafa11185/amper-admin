import { Ticket } from "lucide-react";
import PlaceholderTab from "./PlaceholderTab";

export default function TicketsSection() {
  return (
    <PlaceholderTab
      Icon={Ticket}
      eyebrow="SUPPORT TICKETS · RESTOIQ"
      title="تذاكر الدعم — RestoIQ فقط"
      intro="فلتر الـ SupportTicket الموجود في النظام بحيث يظهر فقط ما يخصّ RestoIQ. الـ schema جاهز (SupportTicket model في Prisma)."
      endpoint="prisma.supportTicket.findMany({ where: { product_id: RESTOIQ_ID } })"
      previewBullets={[
        "كل تذاكر دعم RestoIQ المفتوحة",
        "فلترة حسب الأولويّة والقسم (Cashier · Web · KDS · WhatsApp)",
        "متوسّط زمن أول استجابة + متوسّط زمن الحلّ",
        "تذاكر متأخّرة (لم يردّ عليها فريق الدعم خلال 24س)",
        "وضع التحويل لفريق المنتج عند الحاجة لإصلاح كود",
      ]}
    />
  );
}
