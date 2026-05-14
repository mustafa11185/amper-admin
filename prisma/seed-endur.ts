import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
const prisma = new PrismaClient({ adapter })

async function main() {
  // ─── Endur Tech company info (real values from owner 2026-05-14) ───
  const existingSettings = await prisma.companySettings.findFirst()
  if (!existingSettings) {
    const settings = await prisma.companySettings.create({
      data: {
        name_ar: 'شركة اندر للحلول التقنية',
        name_en: 'Endur Tech',
        tagline_ar: 'منصات SaaS عراقية — أمبير · رستو · براق',
        tagline_en: 'Iraqi SaaS Platforms — Amper · RestoIQ · BARQ',
        registration_no: '952366652',     // from Ministry of Trade certificate
        tax_id: null,                     // owner to provide later
        address_ar: 'بغداد - المنصور',
        address_en: 'Baghdad - Al-Mansour',
        city: 'Baghdad',
        country: 'Iraq',
        phone: '07777626201',
        email: 'enduriraq@gmail.com',
        website: null,                    // future
        invoice_prefix: 'END',
        invoice_next_seq: 1,
        invoice_footer_ar: 'شكراً لاختياركم اندر تك. لأي استفسار: enduriraq@gmail.com',
        invoice_footer_en: 'Thank you for choosing Endur Tech. Inquiries: enduriraq@gmail.com',
      },
    })
    console.log('✅ CompanySettings seeded:', settings.name_en)
  } else {
    console.log('ℹ️  CompanySettings already exists, skipping')
  }

  // ─── Three products ───
  const products = [
    {
      key: 'AMPER' as const,
      name_ar: 'أمبير',
      name_en: 'Amper',
      tagline_ar: 'إدارة ذكية للمولدات الكهربائية',
      tagline_en: 'Smart Generator Management',
      description_ar:
        'منصة SaaS متكاملة لإدارة شبكات مولدات الكهرباء في العراق — مراقبة IoT، تحصيل ذكي، تطبيق جابي أوف لاين.',
      description_en:
        'Full SaaS for Iraqi generator networks — IoT monitoring, smart billing, offline collector app.',
      color: '#1B4FD8',
      icon: 'Zap',
      status: 'ACTIVE' as const,
      sort_order: 1,
      launched_at: new Date('2026-01-01'),
    },
    {
      key: 'RESTOIQ' as const,
      name_ar: 'رستو',
      name_en: 'RestoIQ',
      tagline_ar: 'نظام إدارة المطاعم متعدد المستأجرين',
      tagline_en: 'Multi-tenant Restaurant Management',
      description_ar:
        'منصة لإدارة المطاعم — كاشير، طاولات، طلبات أونلاين، شاشة المطبخ، Marketplace.',
      description_en:
        'Restaurant ops platform — POS, tables, online orders, kitchen display, marketplace.',
      color: '#D97706',
      icon: 'UtensilsCrossed',
      status: 'COMING_SOON' as const,
      sort_order: 2,
    },
    {
      key: 'BARQ' as const,
      name_ar: 'براق',
      name_en: 'BARQ',
      tagline_ar: 'وكيل التسويق الذكي',
      tagline_en: 'AI Marketing Agent',
      description_ar:
        'وكيل ذكاء اصطناعي ينتج حملات تسويقية شهرية كاملة (محتوى + صور + فيديو + نشر) للشركات العراقية.',
      description_en:
        'Autonomous AI agent producing full monthly marketing campaigns for Iraqi businesses.',
      color: '#7C3AED',
      icon: 'Sparkles',
      status: 'COMING_SOON' as const,
      sort_order: 3,
    },
  ]

  for (const p of products) {
    const product = await prisma.product.upsert({
      where: { key: p.key },
      update: {
        name_ar: p.name_ar,
        name_en: p.name_en,
        tagline_ar: p.tagline_ar,
        tagline_en: p.tagline_en,
        description_ar: p.description_ar,
        description_en: p.description_en,
        color: p.color,
        icon: p.icon,
        status: p.status,
        sort_order: p.sort_order,
      },
      create: p,
    })
    console.log(`✅ Product seeded: ${product.key} — ${product.name_en}`)
  }
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
