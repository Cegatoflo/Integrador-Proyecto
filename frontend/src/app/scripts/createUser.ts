import bcrypt from "bcrypt";
import prisma from "../lib/db";

async function createUser() {
  const email = "lorenakimnegrillo@gmail.com";
  const password = "admin123";
  const name = "Lorena";
  const lastName = "Kim";
  const role = "ADMIN";

  try {
    console.log("Iniciando creación de usuario...");
    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        email,
        name,
        lastName,
        password: hashedPassword,
        role,
        isActive: true,
      },
    });

    console.log("✅ Usuario creado exitosamente:", user);
  } catch (error) {
    const prismaError = error as { code?: string; message?: string };
    if (prismaError.code === "P2002") {
      console.log("⚠️ El usuario ya existe en la base de datos");
    } else {
      console.error("❌ Error:", prismaError.message);
    }
  } finally {
    await prisma.$disconnect();
  }
}

createUser();
