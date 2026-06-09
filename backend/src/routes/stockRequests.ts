import { Router, Request, Response } from "express";
import prisma from "../lib/db";

const router = Router();

router.get("/", async (req: Request, res: Response) => {
  try {
    const { requestedBy } = req.query as { requestedBy?: string };
    const requests = await prisma.stockRequest.findMany({
      where: requestedBy ? { requestedBy } : undefined,
      include: { product: { select: { id: true, name: true, sku: true, stock: true } } },
      orderBy: { createdAt: "desc" },
    });
    res.json(requests);
  } catch {
    res.status(500).json({ error: "Error al obtener solicitudes" });
  }
});

router.post("/", async (req: Request, res: Response) => {
  try {
    const { productId, requestedBy, quantityRequested, note } = req.body as {
      productId?: string;
      requestedBy?: string;
      quantityRequested?: number;
      note?: string;
    };

    if (!productId || !requestedBy || !quantityRequested || Number(quantityRequested) <= 0) {
      res.status(400).json({ error: "productId, requestedBy y quantityRequested son requeridos" });
      return;
    }

    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product || !product.isActive) {
      res.status(404).json({ error: "Producto no encontrado" });
      return;
    }

    const request = await prisma.stockRequest.create({
      data: {
        productId,
        requestedBy,
        quantityRequested: Number(quantityRequested),
        note: note || null,
      },
      include: { product: { select: { id: true, name: true, sku: true, stock: true } } },
    });

    res.status(201).json(request);
  } catch {
    res.status(500).json({ error: "Error al crear solicitud" });
  }
});

router.patch("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body as { status?: "PENDING" | "APPROVED" | "REJECTED" };

    if (!status || !["PENDING", "APPROVED", "REJECTED"].includes(status)) {
      res.status(400).json({ error: "Estado inválido" });
      return;
    }

    const updated = await prisma.stockRequest.update({
      where: { id },
      data: { status },
      include: { product: { select: { id: true, name: true, sku: true, stock: true } } },
    });

    res.json(updated);
  } catch {
    res.status(500).json({ error: "Error al actualizar solicitud" });
  }
});

export default router;
