import { Router, Request, Response } from "express";
import prisma from "../lib/db";

const router = Router();

const normalizeText = (value: unknown) => String(value ?? "").trim();
const normalizeSku = (value: unknown) => normalizeText(value).toUpperCase();
const hasMultipleValues = (value: unknown) => /[,;/|]/.test(normalizeText(value));
const isHexColor = (value: unknown) => /^#[0-9A-Fa-f]{6}$/.test(normalizeText(value));

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

    const normalizedSku = normalizeSku(sku);
    const normalizedSize = normalizeText(size);
    const normalizedColor = normalizeText(color).toUpperCase();

    if (!name || !category || price === undefined || stock === undefined || !normalizedSku || !normalizedSize || !normalizedColor) {
      res.status(400).json({ error: "Producto, categoria, SKU, talla, color, precio y stock son requeridos" });
      return;
    }

    if (hasMultipleValues(normalizedSize)) {
      res.status(400).json({ error: "Cada SKU debe tener una sola talla. Crea otro producto para otra talla." });
      return;
    }

    if (hasMultipleValues(normalizedColor) || !isHexColor(normalizedColor)) {
      res.status(400).json({ error: "Cada SKU debe tener un solo color en formato HEX" });
      return;
    }

    const existingSku = await prisma.product.findFirst({
      where: { sku: normalizedSku, isActive: true },
      select: { id: true },
    });
    if (existingSku) {
      res.status(409).json({ error: "Ese SKU ya existe. Cada talla/color debe tener un SKU unico." });
      return;
    }

    const product = await prisma.product.create({
      data: {
        name,
        category,
        price: Number(price),
        stock: Number(stock),
        sku: normalizedSku,
        size: normalizedSize,
        color: normalizedColor,
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
    const updateData: Record<string, any> = {};

    if (name !== undefined) updateData.name = normalizeText(name);
    if (category !== undefined) updateData.category = normalizeText(category);
    if (price !== undefined) updateData.price = Number(price);
    if (stock !== undefined) updateData.stock = Number(stock);
    if (brand !== undefined) updateData.brand = normalizeText(brand) || null;
    if (referencePrice !== undefined) updateData.referencePrice = referencePrice === "" || referencePrice === null ? null : Number(referencePrice);
    if (description !== undefined) updateData.description = normalizeText(description) || null;

    if (sku !== undefined) {
      const normalizedSku = normalizeSku(sku);
      if (!normalizedSku) {
        res.status(400).json({ error: "El SKU es requerido para cada talla/color" });
        return;
      }
      const existingSku = await prisma.product.findFirst({
        where: { sku: normalizedSku, isActive: true, NOT: { id } },
        select: { id: true },
      });
      if (existingSku) {
        res.status(409).json({ error: "Ese SKU ya existe. Cada talla/color debe tener un SKU unico." });
        return;
      }
      updateData.sku = normalizedSku;
    }

    if (size !== undefined) {
      const normalizedSize = normalizeText(size);
      if (!normalizedSize) {
        res.status(400).json({ error: "La talla es requerida" });
        return;
      }
      if (hasMultipleValues(normalizedSize)) {
        res.status(400).json({ error: "Cada SKU debe tener una sola talla. Crea otro producto para otra talla." });
        return;
      }
      updateData.size = normalizedSize;
    }

    if (color !== undefined) {
      const normalizedColor = normalizeText(color).toUpperCase();
      if (!normalizedColor || hasMultipleValues(normalizedColor) || !isHexColor(normalizedColor)) {
        res.status(400).json({ error: "Cada SKU debe tener un solo color en formato HEX" });
        return;
      }
      updateData.color = normalizedColor;
    }

    const product = await prisma.product.update({
      where: { id },
      data: updateData,
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
