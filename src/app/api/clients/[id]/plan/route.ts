export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

// Canonical list of allowed plan keys. Anything outside this set is rejected
// so we can never accidentally write a typo into tenant.plan.
const VALID_PLANS = new Set([
  "starter", "pro", "business", "corporate", "fleet", "custom",
  // Legacy values still present in old DB rows
  "trial", "basic", "gold",
])

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { plan, notes, billing_period } = body as {
      plan?: string
      notes?: string
      billing_period?: "monthly" | "quarterly" | "annual"
    }

    if (!plan) {
      return NextResponse.json({ error: "Plan is required" }, { status: 400 });
    }
    if (!VALID_PLANS.has(plan.toLowerCase())) {
      return NextResponse.json(
        { error: `Invalid plan "${plan}". Allowed: ${[...VALID_PLANS].join(", ")}` },
        { status: 400 },
      );
    }

    // Defensive select — same pattern as /api/plan, survives schema drift.
    let existing: { id: string; plan: string; is_trial: boolean } | null = null
    try {
      existing = await prisma.tenant.findUnique({
        where: { id },
        select: { id: true, plan: true, is_trial: true },
      }) as any
    } catch (err: any) {
      console.warn("[plan PUT] tenant lookup failed:", err.message)
      return NextResponse.json({ error: "Tenant lookup failed" }, { status: 500 })
    }
    if (!existing) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }

    // Compute new subscription_ends_at based on billing period.
    // This is what gives the upgraded tenant a real billing cycle —
    // without it, paid upgrades had no expiry date set.
    const now = new Date()
    const subscriptionEndsAt = new Date(now)
    if (billing_period === "annual") {
      subscriptionEndsAt.setFullYear(subscriptionEndsAt.getFullYear() + 1)
    } else if (billing_period === "quarterly") {
      subscriptionEndsAt.setMonth(subscriptionEndsAt.getMonth() + 3)
    } else {
      subscriptionEndsAt.setMonth(subscriptionEndsAt.getMonth() + 1) // monthly default
    }

    const isPaidPlan = !["starter", "trial"].includes(plan.toLowerCase())

    const tenant = await prisma.$transaction(async (tx) => {
      const updated = await tx.tenant.update({
        where: { id },
        data: {
          plan: plan as any,
          // Clear trial flags whenever upgrading to a real paid plan.
          // Without this the tenant stayed flagged is_trial=true and the
          // grace-period cron would lock them at trial expiry.
          ...(isPaidPlan && existing!.is_trial && {
            is_trial: false,
            trial_ends_at: null,
            is_in_grace_period: false,
            grace_period_ends_at: null,
          }),
          // Start a fresh billing cycle on every paid plan change.
          ...(isPaidPlan && { subscription_ends_at: subscriptionEndsAt }),
        },
      });

      await tx.planChangeLog.create({
        data: {
          tenant_id: id,
          changed_by: (session.user as any).id || "system",
          change_type: existing!.is_trial && isPaidPlan ? "trial_conversion" : "plan_change",
          from_plan: existing!.plan as any,
          to_plan: plan as any,
          notes: notes || null,
        },
      });

      return updated;
    });

    return NextResponse.json({ tenant: { ...tenant, password: undefined } });
  } catch (error: any) {
    console.error("Change plan error:", error);
    return NextResponse.json(
      { error: error?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
