import { Router, Request, Response } from "express";
import bcrypt from "bcrypt";
import crypto from "crypto";
import prisma from "../lib/db";
import { sendTempPasswordEmail } from "../lib/email";

const router = Router();

router.post("/login", async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ error: "Correo electrónico y contraseña son requeridos" });
      return;
    }

    const user = await prisma.user.findUnique({ where: { email } });

    if (!user || !user.isActive) {
      res.status(401).json({ error: "Credenciales inválidas" });
      return;
    }

    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      res.status(401).json({ error: "Credenciales inválidas" });
      return;
    }

    const { password: _, tempPassword: __, tempPasswordExp: ___, ...userWithoutSensitive } = user;
    res.json({ user: userWithoutSensitive, message: "Inicio de sesión exitoso" });
  } catch (error) {
    console.error("Error en login:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

router.post("/forgot-password", async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    if (!email) {
      res.status(400).json({ error: "El correo electrónico es requerido" });
      return;
    }

    const user = await prisma.user.findUnique({ where: { email } });

    // Respuesta genérica por seguridad (no revelar si el email existe)
    if (!user || !user.isActive) {
      res.json({ message: "Si el correo existe, recibirás las instrucciones" });
      return;
    }

    const tempPassword = crypto.randomBytes(4).toString("hex").toUpperCase();
    const hashedTemp = await bcrypt.hash(tempPassword, 10);
    const expiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hora

    await prisma.user.update({
      where: { email },
      data: { tempPassword: hashedTemp, tempPasswordExp: expiry },
    });

    await sendTempPasswordEmail(email, tempPassword);

    res.json({ message: "Si el correo existe, recibirás las instrucciones" });
  } catch (error) {
    console.error("Error en forgot-password:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

router.post("/reset-password", async (req: Request, res: Response) => {
  try {
    const { email, tempPassword, newPassword, confirmPassword } = req.body;

    if (!email || !tempPassword || !newPassword || !confirmPassword) {
      res.status(400).json({ error: "Todos los campos son requeridos" });
      return;
    }

    if (newPassword !== confirmPassword) {
      res.status(400).json({ error: "Las contraseñas no coinciden" });
      return;
    }

    if (newPassword.length < 6) {
      res.status(400).json({ error: "La contraseña debe tener al menos 6 caracteres" });
      return;
    }

    const user = await prisma.user.findUnique({ where: { email } });

    if (!user || !user.tempPassword || !user.tempPasswordExp) {
      res.status(400).json({ error: "Solicitud inválida o expirada" });
      return;
    }

    if (new Date() > user.tempPasswordExp) {
      res.status(400).json({ error: "La contraseña temporal ha expirado. Solicita una nueva." });
      return;
    }

    const tempMatch = await bcrypt.compare(tempPassword, user.tempPassword);
    if (!tempMatch) {
      res.status(400).json({ error: "Contraseña temporal incorrecta" });
      return;
    }

    const hashedNew = await bcrypt.hash(newPassword, 10);

    await prisma.user.update({
      where: { email },
      data: { password: hashedNew, tempPassword: null, tempPasswordExp: null },
    });

    res.json({ message: "Contraseña restablecida exitosamente" });
  } catch (error) {
    console.error("Error en reset-password:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

export default router;
