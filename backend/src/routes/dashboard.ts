import { Router, Request, Response } from "express";
import prisma from "../lib/db";

const router = Router();

router.get("/stats", async (_req: Request, res: Response) => {
  try {
    const [totalProducts, outOfStock, salesData, recentProducts] = await Promise.all([
      prisma.product.count({ where: { isActive: true } }),
      prisma.product.count({ where: { isActive: true, stock: 0 } }),
      prisma.sale.aggregate({ _sum: { total: true } }),
      prisma.product.findMany({
        where: { isActive: true },
        orderBy: { updatedAt: "desc" },
        take: 8,
      }),
    ]);

    res.json({
      totalProducts,
      outOfStock,
      totalSales: salesData._sum.total ?? 0,
      recentProducts,
    });
  } catch (error) {
    res.status(500).json({ error: "Error al obtener estadísticas" });
  }
});

export default router;
