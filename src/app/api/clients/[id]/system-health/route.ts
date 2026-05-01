export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

// System Health Report per client
// Returns a comprehensive health score + per-area breakdown

interface HealthCheck {
  label: string;
  status: 'good' | 'warning' | 'critical';
  value: string;
  detail?: string;
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const checks: HealthCheck[] = [];
    let score = 0;
    let maxScore = 0;

    // 1. Collection rate this month
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    const invoices = await prisma.invoice.findMany({
      where: { tenant_id: id, created_at: { gte: monthStart } },
      select: { amount_paid: true, total_amount_due: true, is_fully_paid: true },
    });
    const totalDue = invoices.reduce((a, i) => a + Number(i.total_amount_due), 0);
    const totalPaid = invoices.reduce((a, i) => a + Number(i.amount_paid), 0);
    const collectionRate = totalDue > 0 ? Math.round((totalPaid / totalDue) * 100) : 100;

    maxScore += 20;
    if (collectionRate >= 80) { score += 20; checks.push({ label: 'نسبة التحصيل', status: 'good', value: `${collectionRate}%` }); }
    else if (collectionRate >= 50) { score += 10; checks.push({ label: 'نسبة التحصيل', status: 'warning', value: `${collectionRate}%`, detail: 'نسبة التحصيل منخفضة' }); }
    else { checks.push({ label: 'نسبة التحصيل', status: 'critical', value: `${collectionRate}%`, detail: 'نسبة التحصيل متدنية جداً' }); }

    // 2. Total debt ratio
    const debtResult = await prisma.subscriber.aggregate({ where: { tenant_id: id }, _sum: { total_debt: true }, _count: true });
    const totalDebt = Number(debtResult._sum?.total_debt ?? 0);
    const subscriberCount = debtResult._count ?? 0;
    const avgDebt = subscriberCount > 0 ? Math.round(totalDebt / subscriberCount) : 0;

    maxScore += 20;
    if (totalDebt === 0) { score += 20; checks.push({ label: 'الديون', status: 'good', value: '0 د.ع', detail: 'لا توجد ديون' }); }
    else if (avgDebt < 50000) { score += 15; checks.push({ label: 'الديون', status: 'good', value: `${totalDebt.toLocaleString()} د.ع`, detail: `معدل ${avgDebt.toLocaleString()} لكل مشترك` }); }
    else if (avgDebt < 150000) { score += 8; checks.push({ label: 'الديون', status: 'warning', value: `${totalDebt.toLocaleString()} د.ع`, detail: `معدل ${avgDebt.toLocaleString()} لكل مشترك — مرتفع` }); }
    else { checks.push({ label: 'الديون', status: 'critical', value: `${totalDebt.toLocaleString()} د.ع`, detail: `معدل ${avgDebt.toLocaleString()} لكل مشترك — خطير` }); }

    // 3. Staff activity (any login in last 7 days?)
    maxScore += 15;
    try {
      const weekAgo = new Date(Date.now() - 7 * 86400000);
      const activeStaff = await prisma.staff.count({
        where: { tenant_id: id, is_active: true, updated_at: { gte: weekAgo } },
      });
      const totalStaff = await prisma.staff.count({ where: { tenant_id: id, is_active: true } });
      if (totalStaff === 0) {
        checks.push({ label: 'نشاط الموظفين', status: 'warning', value: 'لا يوجد موظفين', detail: 'لم يتم إضافة موظفين بعد' });
      } else if (activeStaff > 0) {
        score += 15;
        checks.push({ label: 'نشاط الموظفين', status: 'good', value: `${activeStaff}/${totalStaff} نشط` });
      } else {
        checks.push({ label: 'نشاط الموظفين', status: 'critical', value: `0/${totalStaff} نشط`, detail: 'لا يوجد نشاط لأي موظف منذ أسبوع' });
      }
    } catch {
      checks.push({ label: 'نشاط الموظفين', status: 'warning', value: '-' });
    }

    // 4. IoT uptime
    maxScore += 15;
    try {
      const devices = await prisma.iotDevice.findMany({
        where: { generator: { branch: { tenant_id: id } } },
        select: { is_online: true, last_seen: true },
      });
      if (devices.length === 0) {
        score += 15; // No IoT = no penalty
        checks.push({ label: 'أجهزة IoT', status: 'good', value: 'غير مستخدم', detail: 'لا توجد أجهزة مربوطة' });
      } else {
        const online = devices.filter(d => d.is_online).length;
        const pct = Math.round((online / devices.length) * 100);
        if (pct >= 80) { score += 15; checks.push({ label: 'أجهزة IoT', status: 'good', value: `${online}/${devices.length} متصل (${pct}%)` }); }
        else if (pct >= 50) { score += 8; checks.push({ label: 'أجهزة IoT', status: 'warning', value: `${online}/${devices.length} متصل`, detail: 'بعض الأجهزة غير متصلة' }); }
        else { checks.push({ label: 'أجهزة IoT', status: 'critical', value: `${online}/${devices.length} متصل`, detail: 'أغلب الأجهزة غير متصلة' }); }
      }
    } catch {
      score += 15;
      checks.push({ label: 'أجهزة IoT', status: 'good', value: '-' });
    }

    // 5. Fuel status
    maxScore += 15;
    try {
      const generators = await prisma.generator.findMany({
        where: { branch: { tenant_id: id } },
        select: { fuel_level_pct: true, name: true },
      });
      const withFuel = generators.filter(g => g.fuel_level_pct != null);
      if (withFuel.length === 0) {
        score += 15;
        checks.push({ label: 'الوقود', status: 'good', value: 'غير مفعّل', detail: 'لا توجد بيانات وقود' });
      } else {
        const lowFuel = withFuel.filter(g => (g.fuel_level_pct ?? 100) < 20);
        if (lowFuel.length === 0) { score += 15; checks.push({ label: 'الوقود', status: 'good', value: `${withFuel.length} مولدة — مستوى جيد` }); }
        else { score += 5; checks.push({ label: 'الوقود', status: 'warning', value: `${lowFuel.length} مولدة وقود منخفض`, detail: lowFuel.map(g => g.name).join('، ') }); }
      }
    } catch {
      score += 15;
      checks.push({ label: 'الوقود', status: 'good', value: '-' });
    }

    // 6. Oil change overdue
    maxScore += 15;
    try {
      const engines = await prisma.engine.findMany({
        where: { generator: { branch: { tenant_id: id } } },
        select: { name: true, oil_change_hours: true, runtime_hours: true, hours_at_last_oil: true },
      });
      if (engines.length === 0) {
        score += 15;
        checks.push({ label: 'تغيير الدهن', status: 'good', value: 'لا توجد محركات' });
      } else {
        const overdue = engines.filter(e => {
          const hours = Number(e.runtime_hours) - Number(e.hours_at_last_oil);
          return hours > e.oil_change_hours;
        });
        if (overdue.length === 0) { score += 15; checks.push({ label: 'تغيير الدهن', status: 'good', value: `${engines.length} محرك — جميعها بموعدها` }); }
        else { checks.push({ label: 'تغيير الدهن', status: 'critical', value: `${overdue.length} محرك متأخر`, detail: overdue.map(e => e.name).join('، ') }); }
      }
    } catch {
      score += 15;
      checks.push({ label: 'تغيير الدهن', status: 'good', value: '-' });
    }

    // 7. Supplier debt
    let supplierDebt = 0;
    try {
      const supExpenses = await prisma.expense.aggregate({
        where: { branch: { tenant_id: id }, amount_owed: { gt: 0 } },
        _sum: { amount_owed: true },
      });
      const supPayments = await prisma.supplierPayment.aggregate({
        where: { tenant_id: id },
        _sum: { amount: true },
      });
      supplierDebt = Math.max(0, Number(supExpenses._sum?.amount_owed ?? 0) - Number(supPayments._sum?.amount ?? 0));
    } catch { /* tables may not exist */ }

    const healthPct = maxScore > 0 ? Math.round((score / maxScore) * 100) : 100;

    return NextResponse.json({
      score: healthPct,
      grade: healthPct >= 85 ? 'A' : healthPct >= 70 ? 'B' : healthPct >= 50 ? 'C' : 'D',
      checks,
      summary: {
        collection_rate: collectionRate,
        total_debt: totalDebt,
        subscriber_count: subscriberCount,
        supplier_debt: supplierDebt,
      },
    });
  } catch (error) {
    console.error("System health error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
