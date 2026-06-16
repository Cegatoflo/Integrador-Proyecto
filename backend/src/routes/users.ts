import { Router, Request, Response } from "express";
import bcrypt from "bcrypt";
import prisma from "../lib/db";

const router = Router();

const SAFE_SELECT = {
  id: true,
  email: true,
  name: true,
  lastName: true,
  role: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
};

// Listar usuarios (sin datos sensibles)
router.get("/", async (req: Request, res: Response) => {
  try {
    const { role } = req.query as { role?: string };
    const users = await prisma.user.findMany({
      where: role === "ADMIN" || role === "USER" ? { role } : undefined,
      select: SAFE_SELECT,
      orderBy: { createdAt: "desc" },
    });
    res.json(users);
  } catch {
    res.status(500).json({ error: "Error al obtener usuarios" });
  }
});

// Crear vendedor / admin
router.post("/", async (req: Request, res: Response) => {
  try {
    const { email, name, lastName, password, role } = req.body as {
      email?: string;
      name?: string;
      lastName?: string;
      password?: string;
      role?: string;
    };

    if (!email?.trim() || !name?.trim() || !lastName?.trim() || !password) {
      res.status(400).json({ error: "Correo, nombre, apellido y contraseña son requeridos" });
      return;
    }
    if (String(password).length < 6) {
      res.status(400).json({ error: "La contraseña debe tener al menos 6 caracteres" });
      return;
    }

    const normalizedEmail = email.trim().toLowerCase();
    const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (existing) {
      res.status(409).json({ error: "Ya existe un usuario con ese correo" });
      return;
    }

    const hashedPassword = await bcrypt.hash(String(password), 10);
    const user = await prisma.user.create({
      data: {
        email: normalizedEmail,
        name: name.trim(),
        lastName: lastName.trim(),
        password: hashedPassword,
        role: role === "ADMIN" ? "ADMIN" : "USER",
        isActive: true,
      },
      select: SAFE_SELECT,
    });

    res.status(201).json(user);
  } catch {
    res.status(500).json({ error: "Error al crear usuario" });
  }
});

// Editar datos (nombre, apellido, rol, activo)
router.put("/:id", async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    const { name, lastName, role, isActive } = req.body as {
      name?: string;
      lastName?: string;
      role?: string;
      isActive?: boolean;
    };

    const data: Record<string, unknown> = {};
    if (name !== undefined) data.name = String(name).trim();
    if (lastName !== undefined) data.lastName = String(lastName).trim();
    if (role !== undefined) data.role = role === "ADMIN" ? "ADMIN" : "USER";
    if (isActive !== undefined) data.isActive = Boolean(isActive);

    const user = await prisma.user.update({ where: { id }, data, select: SAFE_SELECT });
    res.json(user);
  } catch {
    res.status(500).json({ error: "Error al actualizar usuario" });
  }
});

// Resetear contraseña (el admin define una nueva directamente)
router.patch("/:id/password", async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    const { password } = req.body as { password?: string };

    if (!password || String(password).length < 6) {
      res.status(400).json({ error: "La contraseña debe tener al menos 6 caracteres" });
      return;
    }

    const hashedPassword = await bcrypt.hash(String(password), 10);
    await prisma.user.update({
      where: { id },
      data: { password: hashedPassword, tempPassword: null, tempPasswordExp: null },
    });

    res.json({ message: "Contraseña actualizada" });
  } catch {
    res.status(500).json({ error: "Error al actualizar contraseña" });
  }
});

export default router;
