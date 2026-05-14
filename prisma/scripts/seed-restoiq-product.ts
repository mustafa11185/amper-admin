/**
 * Seed/upsert the RESTOIQ Product row with the bits needed for the
 * Endur company-admin to call the RestoIQ backend.
 *
 * Run:
 *   npx tsx prisma/scripts/seed-restoiq-product.ts
 *
 * What it does:
 *   1. Ensures a Product row with key='RESTOIQ' exists.
 *   2. Sets `api_base_url` from env var RESTOIQ_API_BASE_URL,
 *      defaulting to http://localhost:3001 (the RestoIQ backend
 *      dev port — see resto repo .env: PORT=3001).
 *   3. Sets `webhook_secret`:
 *      - If env var RESTOIQ_WEBHOOK_SECRET is provided, uses it.
 *      - Else, KEEPS the existing secret in DB (idempotent).
 *      - Else, GENERATES a new 64-char hex secret and prints it
 *        so you can copy it into the RestoIQ backend's .env as
 *        RESTOIQ_HMAC_SECRET. Both sides must match.
 *
 * Idempotent: rerunning without env vars won't rotate the secret,
 * so existing signatures keep working.
 */
import { PrismaClient } from "@prisma/client";
import { randomBytes } from "crypto";

const prisma = new PrismaClient();

async function main() {
  const apiBaseUrl =
    process.env.RESTOIQ_API_BASE_URL?.trim() || "http://localhost:3001";
  const envSecret = process.env.RESTOIQ_WEBHOOK_SECRET?.trim() || null;

  const existing = await prisma.product.findUnique({
    where: { key: "RESTOIQ" },
    select: { id: true, webhook_secret: true, api_base_url: true },
  });

  // Decide which secret to write.
  let secret = envSecret;
  let generated = false;
  if (!secret) {
    if (existing?.webhook_secret) {
      secret = existing.webhook_secret;
    } else {
      secret = randomBytes(32).toString("hex");
      generated = true;
    }
  }

  if (!existing) {
    await prisma.product.create({
      data: {
        key: "RESTOIQ",
        name_ar: "ريستو",
        name_en: "RestoIQ",
        tagline_ar: "منصّة إدارة المطاعم",
        tagline_en: "Restaurant Management Platform",
        color: "#FF4500",
        icon: "UtensilsCrossed",
        status: "ACTIVE",
        api_base_url: apiBaseUrl,
        webhook_secret: secret,
      },
    });
    console.log("✓ Created RESTOIQ Product row");
  } else {
    await prisma.product.update({
      where: { key: "RESTOIQ" },
      data: {
        api_base_url: apiBaseUrl,
        webhook_secret: secret,
      },
    });
    console.log("✓ Updated RESTOIQ Product row");
  }

  console.log("");
  console.log("  api_base_url   :", apiBaseUrl);
  console.log("  webhook_secret :", secret);
  console.log("");

  if (generated) {
    console.log("🔑 GENERATED a new secret. Copy it to the RestoIQ backend's .env:");
    console.log("");
    console.log(`   RESTOIQ_HMAC_SECRET=${secret}`);
    console.log("");
    console.log(
      "Then restart the RestoIQ backend so the new env var is loaded.",
    );
  } else if (envSecret) {
    console.log(
      "Using secret from RESTOIQ_WEBHOOK_SECRET env var. Ensure the SAME value is set as RESTOIQ_HMAC_SECRET on the RestoIQ backend.",
    );
  } else {
    console.log(
      "Re-used existing secret from DB. RestoIQ backend's RESTOIQ_HMAC_SECRET should already match.",
    );
  }
}

main()
  .catch((err) => {
    console.error("✗ Failed:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
