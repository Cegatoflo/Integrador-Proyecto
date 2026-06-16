import { Router, Request, Response } from "express";
import prisma from "../lib/db";

const router = Router();

const PRODUCT_SELECT = { id: true, name: true, sku: true, stock: true };
const SALE_SELECT = { id: true, receiptNumber: true, customerName: true, customerDni: true, createdAt: true };

router.get("/", async (_req: Request, res: Response) => {
  try {
    const returns = await prisma.productReturn.findMany({
      include: { product: { select: PRODUCT_SELECT }, sale: { select: SALE_SELECT } },
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

    if (!saleId || !productId || !quantity || Number(quantity) <= 0 || !reason?.trim()) {
      res.status(400).json({ error: "saleId, productId, quantity y reason son requeridos" });
      return;
    }

    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product) {
      res.status(404).json({ error: "Producto no encontrado" });
      return;
    }

    const sale = await prisma.sale.findUnique({
      where: { id: saleId },
      include: { items: true },
    });
    if (!sale) {
      res.status(404).json({ error: "Venta no encontrada" });
      return;
    }

    const saleItem = sale.items.find((item) => item.productId === productId);
    if (!saleItem) {
      res.status(400).json({ error: "El producto no pertenece a la venta seleccionada" });
      return;
    }

    const previousReturns = await prisma.productReturn.aggregate({
      where: { saleId, productId, status: { not: "REJECTED" } },
      _sum: { quantity: true },
    });
    const alreadyReturned = previousReturns._sum.quantity ?? 0;
    const availableToReturn = saleItem.quantity - alreadyReturned;
    if (Number(quantity) > availableToReturn) {
      res.status(400).json({ error: `Solo quedan ${availableToReturn} unidad(es) disponibles para devolver` });
      return;
    }

    const record = await prisma.productReturn.create({
      data: {
        productId,
        quantity: Number(quantity),
        reason: reason.trim(),
        saleId,
      },
      include: { product: { select: PRODUCT_SELECT }, sale: { select: SALE_SELECT } },
    });

    res.status(201).json(record);
  } catch {
    res.status(500).json({ error: "Error al crear devolución" });
  }
});

router.patch("/:id", async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
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
          include: { product: { select: PRODUCT_SELECT }, sale: { select: SALE_SELECT } },
        });
      });
      res.json(updated);
      return;
    }

    const updated = await prisma.productReturn.update({
      where: { id },
      data: { status, processedBy: processedBy ?? null },
      include: { product: { select: PRODUCT_SELECT }, sale: { select: SALE_SELECT } },
    });
    res.json(updated);
  } catch {
    res.status(500).json({ error: "Error al actualizar devolución" });
  }
});

export default router;
