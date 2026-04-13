// Notification helper for company-admin (mirror of manager-app version).
// Used by the announcement broadcast flow. Respects NotificationPreference
// opt-outs and dedupes by (tenant_id, dedupe_key).

import { prisma } from "./prisma";

export type CreateNotificationInput = {
  tenant_id: string;
  branch_id: string;
  type: string;
  title?: string | null;
  body: string;
  payload?: Record<string, unknown> | null;
  dedupe_key?: string | null;
  user_id?: string | null;
};

export type CreateNotificationResult =
  | { created: true; notification_id: string }
  | { created: false; reason: "disabled" | "duplicate" };

export async function isNotificationEnabled(
  tenant_id: string,
  type: string,
  user_id?: string | null,
): Promise<boolean> {
  if (user_id) {
    const userPref = await prisma.notificationPreference.findUnique({
      where: { tenant_id_user_id_type: { tenant_id, user_id, type } },
    });
    if (userPref) return userPref.enabled;
  }

  const tenantPref = await prisma.notificationPreference
    .findUnique({
      where: {
        tenant_id_user_id_type: { tenant_id, user_id: null, type } as never,
      },
    })
    .catch(() => null);

  if (tenantPref) return tenantPref.enabled;
  return true;
}

export async function createNotification(
  input: CreateNotificationInput,
): Promise<CreateNotificationResult> {
  const enabled = await isNotificationEnabled(
    input.tenant_id,
    input.type,
    input.user_id ?? null,
  );
  if (!enabled) return { created: false, reason: "disabled" };

  if (input.dedupe_key) {
    try {
      const existing = await prisma.notification.findUnique({
        where: {
          tenant_id_dedupe_key: {
            tenant_id: input.tenant_id,
            dedupe_key: input.dedupe_key,
          },
        },
      });
      if (existing) return { created: false, reason: "duplicate" };
    } catch {
      // fall through
    }
  }

  const row = await prisma.notification.create({
    data: {
      tenant_id: input.tenant_id,
      branch_id: input.branch_id,
      type: input.type,
      title: input.title ?? null,
      body: input.body,
      payload: (input.payload ?? null) as never,
      dedupe_key: input.dedupe_key ?? null,
    },
  });

  return { created: true, notification_id: row.id };
}
