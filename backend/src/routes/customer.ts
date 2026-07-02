import { Router, Request, Response } from "express";
import prisma from "../lib/db";

const router = Router();

router.get("/", async (_req: Request, res: Response) => {
  try {
    const clients = await prisma.client.findMany({ orderBy: { createdAt: "desc" } });
    res.json(clients);
  } catch {
    res.status(500).json({ error: "Error al obtener clientes" });
  }
});

router.post("/", async (req: Request, res: Response) => {
  try {
    const { name, dni, email, phone } = req.body;
    const normalizedName = String(name ?? "").trim();
    const normalizedDni = String(dni ?? "").replace(/\D/g, "");

    if (!normalizedName) {
      res.status(400).json({ error: "El nombre es requerido" });
      return;
    }
    if (!/^\d{8}$/.test(normalizedDni)) {
      res.status(400).json({ error: "El DNI debe tener exactamente 8 dígitos" });
      return;
    }

    const existing = await prisma.client.findUnique({ where: { dni: normalizedDni }, select: { id: true } });
    if (existing) {
      res.status(409).json({ error: "Ya existe un cliente con ese DNI" });
      return;
    }

    const client = await prisma.client.create({
      data: {
        name: normalizedName,
        dni: normalizedDni,
        email: String(email ?? "").trim() || null,
        phone: String(phone ?? "").trim() || null,
      },
    });
    res.status(201).json(client);
  } catch {
    res.status(500).json({ error: "Error al crear cliente" });
  }
});

router.put("/:id", async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    const { name, email, phone } = req.body;
    const updateData: Record<string, unknown> = {};

    if (name !== undefined) updateData.name = String(name).trim();
    if (email !== undefined) updateData.email = String(email).trim() || null;
    if (phone !== undefined) updateData.phone = String(phone).trim() || null;

    const client = await prisma.client.update({ where: { id }, data: updateData });
    res.json(client);
  } catch {
    res.status(500).json({ error: "Error al actualizar cliente" });
  }
});

router.delete("/:id", async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    await prisma.client.delete({ where: { id } });
    res.json({ message: "Cliente eliminado" });
  } catch {
    res.status(500).json({ error: "Error al eliminar cliente" });
  }
});

export default router;
