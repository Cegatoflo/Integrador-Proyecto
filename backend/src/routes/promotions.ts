import { Router, Request, Response } from "express";
import prisma from "../lib/db";

const router = Router();

const PRODUCT_SELECT = { id: true, name: true, sku: true, stock: true, price: true };

router.get("/", async (_req: Request, res: Response) => {
  try {
    const promotions = await prisma.promotion.findMany({
      include: { product: { select: PRODUCT_SELECT } },
      orderBy: { createdAt: "desc" },
    });
    res.json(promotions);
  } catch {
    res.status(500).json({ error: "Error al obtener promociones" });
  }
});

router.post("/", async (req: Request, res: Response) => {
  try {
    const { name, description, discountType, discountValue, productId, startDate, endDate, createdBy } =
      req.body as {
        name?: string;
        description?: string;
        discountType?: "PERCENTAGE" | "FIXED";
        discountValue?: number;
        productId?: string;
        startDate?: string;
        endDate?: string;
        createdBy?: string;
      };

    if (!name?.trim() || !discountType || discountValue === undefined || !startDate || !endDate || !createdBy) {
      res.status(400).json({ error: "name, discountType, discountValue, startDate, endDate y createdBy son requeridos" });
      return;
    }

    if (!["PERCENTAGE", "FIXED"].includes(discountType)) {
      res.status(400).json({ error: "discountType debe ser PERCENTAGE o FIXED" });
      return;
    }

    if (discountType === "PERCENTAGE" && (Number(discountValue) <= 0 || Number(discountValue) > 100)) {
      res.status(400).json({ error: "El descuento porcentual debe estar entre 1 y 100" });
      return;
    }

    if (new Date(startDate) >= new Date(endDate)) {
      res.status(400).json({ error: "La fecha de inicio debe ser anterior a la fecha de fin" });
      return;
    }

    if (productId) {
      const product = await prisma.product.findUnique({ where: { id: productId } });
      if (!product || !product.isActive) {
        res.status(404).json({ error: "Producto no encontrado" });
        return;
      }
    }

    const promotion = await prisma.promotion.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        discountType,
        discountValue: Number(discountValue),
        productId: productId || null,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        createdBy,
      },
      include: { product: { select: PRODUCT_SELECT } },
    });

    res.status(201).json(promotion);
  } catch {
    res.status(500).json({ error: "Error al crear promoción" });
  }
});

router.patch("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { isActive, name, description, discountType, discountValue, startDate, endDate } = req.body as {
      isActive?: boolean;
      name?: string;
      description?: string;
      discountType?: "PERCENTAGE" | "FIXED";
      discountValue?: number;
      startDate?: string;
      endDate?: string;
    };

    const updated = await prisma.promotion.update({
      where: { id },
      data: {
        ...(isActive !== undefined && { isActive }),
        ...(name?.trim() && { name: name.trim() }),
        ...(description !== undefined && { description: description?.trim() || null }),
        ...(discountType && { discountType }),
        ...(discountValue !== undefined && { discountValue: Number(discountValue) }),
        ...(startDate && { startDate: new Date(startDate) }),
        ...(endDate && { endDate: new Date(endDate) }),
      },
      include: { product: { select: PRODUCT_SELECT } },
    });
    res.json(updated);
  } catch {
    res.status(500).json({ error: "Error al actualizar promoción" });
  }
});

router.delete("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await prisma.promotion.delete({ where: { id } });
    res.json({ message: "Promoción eliminada" });
  } catch {
    res.status(500).json({ error: "Error al eliminar promoción" });
  }
});

export default router;
