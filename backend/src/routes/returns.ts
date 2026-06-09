import { Router, Request, Response } from "express";
import prisma from "../lib/db";

const router = Router();

const PRODUCT_SELECT = { id: true, name: true, sku: true, stock: true };

router.get("/", async (_req: Request, res: Response) => {
  try {
    const returns = await prisma.productReturn.findMany({
      include: { product: { select: PRODUCT_SELECT } },
      orderBy: { createdAt: "desc" },
    });
    res.json(returns);
  } catch {
    res.status(500).json({ error: "Error al obtener devoluciones" });
  }
});

router.post("/", async (req: Request, res: Response) => {
  try {
    const { productId, quantity, reason, saleId } = req.body as {
      productId?: string;
      quantity?: number;
      reason?: string;
      saleId?: string;
    };

    if (!productId || !quantity || Number(quantity) <= 0 || !reason?.trim()) {
      res.status(400).json({ error: "productId, quantity y reason son requeridos" });
      return;
    }

    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product || !product.isActive) {
      res.status(404).json({ error: "Producto no encontrado" });
      return;
    }

    const record = await prisma.productReturn.create({
      data: {
        productId,
        quantity: Number(quantity),
        reason: reason.trim(),
        saleId: saleId || null,
      },
      include: { product: { select: PRODUCT_SELECT } },
    });

    res.status(201).json(record);
  } catch {
    res.status(500).json({ error: "Error al crear devolución" });
  }
});

router.patch("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status, processedBy } = req.body as {
      status?: "PENDING" | "APPROVED" | "REJECTED";
      processedBy?: string;
    };

    if (!status || !["PENDING", "APPROVED", "REJECTED"].includes(status)) {
      res.status(400).json({ error: "Estado inválido" });
      return;
    }

    const existing = await prisma.productReturn.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ error: "Devolución no encontrada" });
      return;
    }

    // Restore stock only when transitioning to APPROVED for the first time
    if (status === "APPROVED" && existing.status !== "APPROVED") {
      const updated = await prisma.$transaction(async (tx) => {
        await tx.product.update({
          where: { id: existing.productId },
          data: { stock: { increment: existing.quantity } },
        });
        return tx.productReturn.update({
          where: { id },
          data: { status, processedBy: processedBy ?? null },
          include: { product: { select: PRODUCT_SELECT } },
        });
      });
      res.json(updated);
      return;
    }

    const updated = await prisma.productReturn.update({
      where: { id },
      data: { status, processedBy: processedBy ?? null },
      include: { product: { select: PRODUCT_SELECT } },
    });
    res.json(updated);
  } catch {
    res.status(500).json({ error: "Error al actualizar devolución" });
  }
});

export default router;
