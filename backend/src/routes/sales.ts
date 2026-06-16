import { Router, Request, Response } from "express";
import prisma from "../lib/db";

const router = Router();

router.get("/", async (_req: Request, res: Response) => {
  try {
    const sales = await prisma.sale.findMany({
      include: { items: { include: { product: true } } },
      orderBy: { createdAt: "desc" },
    });
    res.json(sales);
  } catch (error) {
    res.status(500).json({ error: "Error al obtener ventas" });
  }
});

router.post("/", async (req: Request, res: Response) => {
  try {
    const {
      items,
      receiptNumber,
      customerName,
      customerDni,
      customerEmail,
      paymentMethod,
      paymentStatus,
      transactionReference,
      amountPaid,
      changeAmount,
    } = req.body as {
      items: { productId: string; quantity: number; price: number }[];
      receiptNumber?: string;
      customerName?: string;
      customerDni?: string;
      customerEmail?: string;
      paymentMethod?: string;
      paymentStatus?: string;
      transactionReference?: string;
      amountPaid?: number;
      changeAmount?: number;
    };

    if (!items || items.length === 0) {
      res.status(400).json({ error: "La venta debe tener al menos un producto" });
      return;
    }

    const saleReceiptNumber = receiptNumber?.trim();
    if (saleReceiptNumber) {
      const existingSale = await prisma.sale.findFirst({ where: { receiptNumber: saleReceiptNumber } });
      if (existingSale) {
        res.status(409).json({ error: "Ya existe una venta con ese numero de boleta" });
        return;
      }
    }

    // Verificar stock disponible
    for (const item of items) {
      const product = await prisma.product.findUnique({ where: { id: item.productId } });
      if (!product || product.stock < item.quantity) {
        res.status(400).json({ error: `Stock insuficiente para "${product?.name ?? item.productId}"` });
        return;
      }
    }

    const total = items.reduce((sum, i) => sum + i.price * i.quantity, 0);

    const sale = await prisma.$transaction(async (tx) => {
      const newSale = await tx.sale.create({
        data: {
          receiptNumber: saleReceiptNumber || null,
          total,
          customerName: customerName || null,
          customerDni: customerDni || null,
          customerEmail: customerEmail || null,
          paymentMethod: paymentMethod || "efectivo",
          paymentStatus: paymentStatus || "approved",
          transactionReference: transactionReference || null,
          amountPaid: amountPaid === undefined ? null : Number(amountPaid),
          changeAmount: changeAmount === undefined ? null : Number(changeAmount),
          items: {
            create: items.map((i) => ({
              productId: i.productId,
              quantity: i.quantity,
              price: i.price,
            })),
          },
        },
        include: { items: { include: { product: true } } },
      });

      // Descontar stock
      for (const item of items) {
        await tx.product.update({
          where: { id: item.productId },
          data: { stock: { decrement: item.quantity } },
        });
      }

      return newSale;
    });

    res.status(201).json(sale);
  } catch (error) {
    console.error("Error en venta:", error);
    res.status(500).json({ error: "Error al procesar la venta" });
  }
});

export default router;
