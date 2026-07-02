import { Router, Request, Response } from "express";
import bcrypt from "bcrypt";
import prisma from "../lib/db";

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

export default router;
