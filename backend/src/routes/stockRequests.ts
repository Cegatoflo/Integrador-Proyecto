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
    const id = String(req.params.id);
    const { status } = req.body as { status?: "PENDING" | "APPROVED" | "REJECTED" };

    if (!status || !["PENDING", "APPROVED", "REJECTED"].includes(status)) {
      res.status(400).json({ error: "Estado inválido" });
      return;
    }

    const requestInclude = { product: { select: { id: true, name: true, sku: true, stock: true } } };

    // Lecturas fuera de la transacción para no mantenerla abierta (evita timeouts con DB remota).
    const existing = await prisma.stockRequest.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ error: "Solicitud no encontrada" });
      return;
    }

    // Solo sumamos stock al pasar de PENDIENTE -> APROBADA (evita duplicar al re-aprobar).
    if (status === "APPROVED" && existing.status === "PENDING") {
      const product = await prisma.product.findUnique({ where: { id: existing.productId } });
      if (!product || !product.isActive) {
        res.status(404).json({ error: "Producto no encontrado" });
        return;
      }

      const previousStock = product.stock;
      const newStock = previousStock + existing.quantityRequested;

      // Transacción por lotes: 3 writes atómicos, sin transacción interactiva.
      const [, , updated] = await prisma.$transaction([
        prisma.product.update({ where: { id: product.id }, data: { stock: newStock } }),
        prisma.stockEntry.create({
          data: {
            productId: product.id,
            quantity: existing.quantityRequested,
            previousStock,
            newStock,
            note: `Solicitud aprobada · ${existing.requestedBy}`,
          },
        }),
        prisma.stockRequest.update({ where: { id }, data: { status }, include: requestInclude }),
      ]);

      res.json(updated);
      return;
    }

    // Rechazo o cambio de estado sin afectar el stock.
    const updated = await prisma.stockRequest.update({ where: { id }, data: { status }, include: requestInclude });
    res.json(updated);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error al actualizar solicitud";
    res.status(500).json({ error: message });
  }
});

export default router;
