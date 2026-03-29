import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient(): PrismaClient {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error("[prisma] DATABASE_URL is not set");
    return new PrismaClient();
  }
  try {
    const adapter = new PrismaPg({ connectionString });
    return new PrismaClient({ adapter });
  } catch (err) {
    console.error("[prisma] PrismaPg adapter failed, falling back:", err);
    return new PrismaClient();
  }
}

if (!globalForPrisma.prisma) {
  globalForPrisma.prisma = createPrismaClient();
}

export const prisma: PrismaClient = globalForPrisma.prisma;
export default prisma;
