import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

const users = [
  {
    email: "lorenakimnegrillo@gmail.com",
    password: "admin123",
    name: "Lorena",
    lastName: "Kim",
    role: Role.ADMIN,
  },
  {
    email: "cesartorres@topmodas.local",
    password: "torres123",
    name: "Cesar",
    lastName: "Torres",
    role: Role.USER,
  },
];

async function main() {
  for (const user of users) {
    const hashedPassword = await bcrypt.hash(user.password, 10);

    await prisma.user.upsert({
      where: { email: user.email },
      update: {
        name: user.name,
        lastName: user.lastName,
        password: hashedPassword,
        role: user.role,
        isActive: true,
        tempPassword: null,
        tempPasswordExp: null,
      },
      create: {
        email: user.email,
        name: user.name,
        lastName: user.lastName,
        password: hashedPassword,
        role: user.role,
        isActive: true,
      },
    });

    console.log(`${user.email} -> ${user.role}`);
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
