import { Router, Request, Response } from "express";
import prisma from "../lib/db";

const router = Router();

router.get("/", async (_req: Request, res: Response) => {
  try {
    const entries = await prisma.stockEntry.findMany({
      include: { product: true },
      orderBy: { createdAt: "desc" },
    });
    res.json(entries);
  } catch (error) {
    res.status(500).json({ error: "Error al obtener entradas de stock" });
  }
});

router.post("/", async (req: Request, res: Response) => {
  try {
    const { productId, quantity, note } = req.body as {
      productId?: string;
      quantity?: number;
      note?: string;
    };

    if (!productId || !quantity || Number(quantity) <= 0) {
      res.status(400).json({ error: "Producto y cantidad son requeridos" });
      return;
    }

    const entry = await prisma.$transaction(async (tx) => {
      const product = await tx.product.findUnique({ where: { id: productId } });
      if (!product || !product.isActive) {
        throw new Error("Producto no encontrado");
      }

      const previousStock = product.stock;
      const newStock = previousStock + Number(quantity);

      await tx.product.update({
        where: { id: productId },
        data: { stock: newStock },
      });

      return tx.stockEntry.create({
        data: {
          productId,
          quantity: Number(quantity),
          previousStock,
          newStock,
          note: note || null,
        },
        include: { product: true },
      });
    });

    res.status(201).json(entry);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error al registrar entrada";
    res.status(500).json({ error: message });
  }
});

export default router;
