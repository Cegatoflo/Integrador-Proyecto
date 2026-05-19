import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function main() {
  try {
    console.log("Conectando a la base de datos...");

    const email = "lorenakimnegrillo@gmail.com";
    const password = "admin123";
    const hashedPassword = await bcrypt.hash(password, 10);

    console.log("Intentando crear usuario admin...");

    const user = await prisma.user.create({
      data: {
        email,
        name: "Lorena",
        lastName: "Kim",
        password: hashedPassword,
        role: "ADMIN",
        isActive: true,
      },
    });

    console.log("Usuario creado:", JSON.stringify(user, null, 2));
  } catch (error: any) {
    if (error.code === "P2002") {
      console.log("El usuario ya existe");
    } else {
      console.error("Error:", error.message);
    }
  } finally {
    await prisma.$disconnect();
  }
}

main();
