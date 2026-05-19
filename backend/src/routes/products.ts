import { Router, Request, Response } from "express";
import prisma from "../lib/db";

const router = Router();

router.get("/", async (_req: Request, res: Response) => {
  try {
    const products = await prisma.product.findMany({
      where: { isActive: true },
      orderBy: { createdAt: "desc" },
    });
    res.json(products);
  } catch (error) {
    res.status(500).json({ error: "Error al obtener productos" });
  }
});

router.post("/", async (req: Request, res: Response) => {
  try {
    const { name, category, price, stock, sku, size, color, brand, referencePrice, description } = req.body;

    if (!name || !category || price === undefined || stock === undefined) {
      res.status(400).json({ error: "Todos los campos son requeridos" });
      return;
    }

    const product = await prisma.product.create({
      data: {
        name,
        category,
        price: Number(price),
        stock: Number(stock),
        sku: sku || null,
        size: size || null,
        color: color || null,
        brand: brand || null,
        referencePrice: referencePrice === undefined || referencePrice === "" ? null : Number(referencePrice),
        description: description || null,
      },
    });

    res.status(201).json(product);
  } catch (error) {
    res.status(500).json({ error: "Error al crear producto" });
  }
});

router.put("/:id", async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    const { name, category, price, stock, sku, size, color, brand, referencePrice, description } = req.body;

    const product = await prisma.product.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(category !== undefined && { category }),
        ...(price !== undefined && { price: Number(price) }),
        ...(stock !== undefined && { stock: Number(stock) }),
        ...(sku !== undefined && { sku: sku || null }),
        ...(size !== undefined && { size: size || null }),
        ...(color !== undefined && { color: color || null }),
        ...(brand !== undefined && { brand: brand || null }),
        ...(referencePrice !== undefined && { referencePrice: referencePrice === "" ? null : Number(referencePrice) }),
        ...(description !== undefined && { description: description || null }),
      },
    });

    res.json(product);
  } catch (error) {
    res.status(500).json({ error: "Error al actualizar producto" });
  }
});

router.delete("/:id", async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    await prisma.product.update({ where: { id }, data: { isActive: false } });
    res.json({ message: "Producto eliminado" });
  } catch (error) {
    res.status(500).json({ error: "Error al eliminar producto" });
  }
});

export default router;
