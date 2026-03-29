import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import bcrypt from 'bcryptjs'

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
const prisma = new PrismaClient({ adapter })

async function main() {
  const password = await bcrypt.hash('Admin@123', 12)

  const admin = await prisma.companyUser.upsert({
    where: { email: 'admin@amper.iq' },
    update: {},
    create: {
      email: 'admin@amper.iq',
      password,
      name: 'Amper Admin',
      role: 'super_admin',
      is_active: true,
    },
  })

  console.log('✅ Admin created:', admin.email)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
