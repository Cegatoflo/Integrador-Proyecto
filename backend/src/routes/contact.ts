import { Router, Request, Response } from "express";
import prisma from "../lib/db";

const router = Router();

// Crear mensaje de contacto (se guarda para que el admin lo vea en la campana)
router.post("/", async (req: Request, res: Response) => {
  try {
    const { name, email, message } = req.body;
    const normalizedName = String(name ?? "").trim();
    const normalizedEmail = String(email ?? "").trim();
    const normalizedMessage = String(message ?? "").trim();

    if (!normalizedName || !normalizedEmail || !normalizedMessage) {
      res.status(400).json({ error: "Todos los campos son requeridos" });
      return;
    }

    const contact = await prisma.contactMessage.create({
      data: { name: normalizedName, email: normalizedEmail, message: normalizedMessage },
    });

    res.status(201).json(contact);
  } catch (error) {
    console.error("Error en contact:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

// Listar mensajes para la campana del admin. ?unread=true devuelve solo los no leidos.
router.get("/", async (req: Request, res: Response) => {
  try {
    const unreadOnly = req.query.unread === "true";
    const messages = await prisma.contactMessage.findMany({
      where: unreadOnly ? { read: false } : undefined,
      orderBy: { createdAt: "desc" },
    });
    res.json(messages);
  } catch {
    res.status(500).json({ error: "Error al obtener mensajes" });
  }
});

// Marcar un mensaje como leido (lo saca de la campana)
router.patch("/:id/read", async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    const message = await prisma.contactMessage.update({
      where: { id },
      data: { read: true },
    });
    res.json(message);
  } catch {
    res.status(500).json({ error: "Error al actualizar mensaje" });
  }
});

export default router;
