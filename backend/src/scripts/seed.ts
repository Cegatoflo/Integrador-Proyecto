import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const now = new Date();
function at(daysAgo: number, hour = 12, minute = 0): Date {
  const d = new Date(now);
  d.setDate(d.getDate() - daysAgo);
  d.setHours(hour, minute, 0, 0);
  return d;
}
function receipt(date: Date, seq: number): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `B001-${y}${m}${day}-${String(seq).padStart(4, "0")}`;
}
const ref = (method: string) => `${method.toUpperCase()}-${Math.floor(1000000 + Math.random() * 9000000)}`;

type Status = "PENDING" | "APPROVED" | "REJECTED";

async function main() {
  console.log("🌱 Seed Top Modas — iniciando...");

  // 1) Conservar SOLO los usuarios reales: borrar la cuenta de prueba si existe.
  const delTest = await prisma.user.deleteMany({ where: { email: "prueba.claude@test.com" } });
  if (delTest.count) console.log(`🧹 Cuenta de prueba eliminada (${delTest.count}).`);

  // 2) Borrar toda la data transaccional (orden seguro por llaves foráneas).
  await prisma.productReturn.deleteMany();
  await prisma.saleItem.deleteMany();
  await prisma.stockEntry.deleteMany();
  await prisma.stockRequest.deleteMany();
  await prisma.promotion.deleteMany();
  await prisma.sale.deleteMany();
  await prisma.product.deleteMany();
  console.log("🧹 Datos anteriores borrados (productos, ventas, devoluciones, solicitudes, entradas, promos).");

  // 3) Usuarios reales para vincular la data.
  const users = await prisma.user.findMany({ orderBy: { createdAt: "asc" } });
  if (users.length === 0) throw new Error("No hay usuarios. Crea el admin antes de sembrar (npm run seed:admin).");
  const admin = users.find((u) => u.role === "ADMIN");
  const seller = users.find((u) => u.role === "USER") ?? admin!;
  const adminName = admin?.name ?? "Admin";
  const sellerName = seller?.name ?? "Vendedor";
  console.log(`👥 Usuarios conservados: ${users.map((u) => `${u.name} (${u.role})`).join(", ")}`);

  // 4) Productos (tienda de modas, precios en Soles). Stocks variados para que haya alertas.
  const productSeed = [
    { name: "Blusa floral manga corta", category: "Ropa", price: 59.9, stock: 24, sku: "TOP-BLU-001", size: "M", color: "#E85B9C", brand: "Zara", referencePrice: 35, description: "Blusa de verano, tela ligera" },
    { name: "Blusa floral manga corta", category: "Ropa", price: 59.9, stock: 8, sku: "TOP-BLU-002", size: "L", color: "#E85B9C", brand: "Zara", referencePrice: 35, description: "Blusa de verano, tela ligera" },
    { name: "Jean skinny tiro alto", category: "Ropa", price: 89.9, stock: 15, sku: "TOP-JEA-001", size: "28", color: "#2B3A55", brand: "H&M", referencePrice: 50, description: "Denim elástico, tiro alto" },
    { name: "Jean skinny tiro alto", category: "Ropa", price: 89.9, stock: 2, sku: "TOP-JEA-002", size: "30", color: "#2B3A55", brand: "H&M", referencePrice: 50, description: "Denim elástico, tiro alto" },
    { name: "Vestido casual midi", category: "Ropa", price: 119.9, stock: 12, sku: "TOP-VES-001", size: "M", color: "#C0392B", brand: "Shein", referencePrice: 70, description: "Vestido midi para ocasiones casuales" },
    { name: "Polo básico algodón", category: "Ropa", price: 39.9, stock: 40, sku: "TOP-POL-001", size: "L", color: "#FFFFFF", brand: "Top Modas", referencePrice: 20, description: "Algodón pima, corte regular" },
    { name: "Casaca jean oversize", category: "Ropa", price: 149.9, stock: 6, sku: "TOP-CAS-001", size: "M", color: "#5D8AA8", brand: "Zara", referencePrice: 90, description: "Casaca denim oversize" },
    { name: "Falda plisada", category: "Ropa", price: 69.9, stock: 0, sku: "TOP-FAL-001", size: "S", color: "#1C1C1C", brand: "Shein", referencePrice: 40, description: "Falda plisada midi" },
    { name: "Zapatillas urbanas", category: "Calzado", price: 199.9, stock: 18, sku: "TOP-ZAP-001", size: "38", color: "#FFFFFF", brand: "Nike", referencePrice: 130, description: "Zapatillas urbanas clásicas" },
    { name: "Zapatillas running", category: "Calzado", price: 249.9, stock: 3, sku: "TOP-ZAP-002", size: "40", color: "#111111", brand: "Adidas", referencePrice: 160, description: "Para correr, suela amortiguada" },
    { name: "Sandalias de plataforma", category: "Calzado", price: 89.9, stock: 14, sku: "TOP-SAN-001", size: "37", color: "#D2A679", brand: "Top Modas", referencePrice: 50, description: "Sandalias de plataforma de verano" },
    { name: "Botines de cuero", category: "Calzado", price: 179.9, stock: 9, sku: "TOP-BOT-001", size: "38", color: "#5B3A29", brand: "Top Modas", referencePrice: 110, description: "Botines de cuero sintético" },
    { name: "Cartera de mano", category: "Accesorios", price: 79.9, stock: 22, sku: "TOP-CAR-001", size: "Unitalla", color: "#8B0000", brand: "Top Modas", referencePrice: 45, description: "Cartera de mano elegante" },
    { name: "Correa de cuero", category: "Accesorios", price: 34.9, stock: 30, sku: "TOP-COR-001", size: "Unitalla", color: "#3B2F2F", brand: "Top Modas", referencePrice: 18, description: "Correa de cuero sintético" },
    { name: "Gorra deportiva", category: "Deportivo", price: 44.9, stock: 5, sku: "TOP-GOR-001", size: "Unitalla", color: "#000000", brand: "Nike", referencePrice: 25, description: "Gorra ajustable transpirable" },
    { name: "Leggins deportivos", category: "Deportivo", price: 64.9, stock: 16, sku: "TOP-LEG-001", size: "M", color: "#2E2E2E", brand: "Adidas", referencePrice: 38, description: "Leggins de alta compresión" },
    { name: "Brasier sin costura", category: "Ropa interior", price: 49.9, stock: 1, sku: "TOP-BRA-001", size: "M", color: "#F5C9D6", brand: "Leonisa", referencePrice: 28, description: "Brasier sin costura, soporte medio" },
    { name: "Pijama de algodón", category: "Ropa interior", price: 74.9, stock: 11, sku: "TOP-PIJ-001", size: "L", color: "#B0C4DE", brand: "Crystal", referencePrice: 42, description: "Pijama de algodón dos piezas" },
  ];
  const products = await Promise.all(productSeed.map((data) => prisma.product.create({ data })));
  const P = (sku: string) => {
    const p = products.find((x) => x.sku === sku);
    if (!p) throw new Error(`Producto no encontrado: ${sku}`);
    return p;
  };
  console.log(`👕 ${products.length} productos creados.`);

  // 5) Ventas + items (repartidas en los últimos 12 días, métodos de pago variados).
  const salesDef: {
    day: number;
    hour: number;
    payment: string;
    customer?: { name?: string; dni?: string; email?: string };
    items: { sku: string; qty: number }[];
  }[] = [
    { day: 0, hour: 11, payment: "efectivo", customer: { name: "María López", dni: "45612378", email: "maria.lopez@gmail.com" }, items: [{ sku: "TOP-BLU-001", qty: 1 }, { sku: "TOP-COR-001", qty: 1 }] },
    { day: 0, hour: 17, payment: "yape", items: [{ sku: "TOP-POL-001", qty: 2 }] },
    { day: 1, hour: 12, payment: "tarjeta_credito", customer: { name: "José Ramírez", dni: "10293847" }, items: [{ sku: "TOP-ZAP-001", qty: 1 }] },
    { day: 1, hour: 19, payment: "plin", customer: { name: "Lucía Fernández", dni: "73829104", email: "lucia.f@hotmail.com" }, items: [{ sku: "TOP-VES-001", qty: 1 }, { sku: "TOP-CAR-001", qty: 1 }] },
    { day: 2, hour: 10, payment: "efectivo", items: [{ sku: "TOP-GOR-001", qty: 1 }] },
    { day: 3, hour: 16, payment: "transferencia", customer: { name: "Carlos Díaz", dni: "40561239" }, items: [{ sku: "TOP-BOT-001", qty: 1 }, { sku: "TOP-LEG-001", qty: 1 }] },
    { day: 4, hour: 13, payment: "tarjeta_debito", customer: { name: "Ana Torres", dni: "29384756", email: "ana.torres@gmail.com" }, items: [{ sku: "TOP-JEA-001", qty: 1 }] },
    { day: 5, hour: 18, payment: "yape", items: [{ sku: "TOP-SAN-001", qty: 1 }, { sku: "TOP-PIJ-001", qty: 1 }] },
    { day: 6, hour: 11, payment: "efectivo", customer: { name: "Pedro Sánchez", dni: "56473829" }, items: [{ sku: "TOP-ZAP-002", qty: 1 }] },
    { day: 7, hour: 15, payment: "billetera_digital", customer: { name: "Rosa Mendoza", dni: "61728394", email: "rosa.m@gmail.com" }, items: [{ sku: "TOP-CAS-001", qty: 1 }, { sku: "TOP-BLU-002", qty: 1 }] },
    { day: 8, hour: 12, payment: "efectivo", items: [{ sku: "TOP-COR-001", qty: 2 }, { sku: "TOP-POL-001", qty: 1 }] },
    { day: 9, hour: 17, payment: "qr", customer: { name: "Diego Vargas", dni: "84736251" }, items: [{ sku: "TOP-LEG-001", qty: 2 }] },
    { day: 10, hour: 14, payment: "tarjeta_credito", customer: { name: "Sofía Castro", dni: "39201847", email: "sofia.castro@gmail.com" }, items: [{ sku: "TOP-CAR-001", qty: 1 }] },
    { day: 12, hour: 16, payment: "yape", items: [{ sku: "TOP-BLU-001", qty: 1 }, { sku: "TOP-GOR-001", qty: 1 }] },
  ];

  let seq = 1;
  const createdSales = [];
  for (const s of salesDef) {
    const date = at(s.day, s.hour, (seq * 7) % 60);
    const itemsData = s.items.map((it) => {
      const p = P(it.sku);
      return { productId: p.id, quantity: it.qty, price: p.price };
    });
    const total = Number(itemsData.reduce((sum, it) => sum + it.price * it.quantity, 0).toFixed(2));
    const isCash = s.payment === "efectivo";
    const amountPaid = isCash ? Math.ceil(total / 10) * 10 : total;
    const sale = await prisma.sale.create({
      data: {
        receiptNumber: receipt(date, seq),
        total,
        customerName: s.customer?.name ?? null,
        customerDni: s.customer?.dni ?? null,
        customerEmail: s.customer?.email ?? null,
        paymentMethod: s.payment,
        paymentStatus: "PAID",
        transactionReference: isCash ? null : ref(s.payment),
        amountPaid,
        changeAmount: isCash ? Number((amountPaid - total).toFixed(2)) : 0,
        createdAt: date,
        items: { create: itemsData },
      },
      include: { items: true },
    });
    createdSales.push(sale);
    seq++;
  }
  console.log(`🧾 ${createdSales.length} ventas creadas.`);

  // 6) Entradas de stock (reposiciones recientes).
  const entriesDef = [
    { sku: "TOP-POL-001", qty: 20, prev: 20, day: 9, note: "Reposición proveedor Top Modas" },
    { sku: "TOP-ZAP-001", qty: 10, prev: 8, day: 7, note: "Ingreso de mercadería Nike" },
    { sku: "TOP-CAR-001", qty: 12, prev: 10, day: 5, note: "Reposición proveedor" },
    { sku: "TOP-LEG-001", qty: 8, prev: 8, day: 3, note: `Solicitud aprobada · ${sellerName}` },
    { sku: "TOP-COR-001", qty: 15, prev: 15, day: 2, note: "Ajuste de inventario" },
  ];
  for (const e of entriesDef) {
    const p = P(e.sku);
    await prisma.stockEntry.create({
      data: { productId: p.id, quantity: e.qty, previousStock: e.prev, newStock: e.prev + e.qty, note: e.note, createdAt: at(e.day, 9) },
    });
  }
  console.log(`📦 ${entriesDef.length} entradas de stock creadas.`);

  // 7) Solicitudes de reposición (algunas PENDIENTES para que salgan en la campana).
  const reqDef: { sku: string; qty: number; status: Status; day: number; note?: string }[] = [
    { sku: "TOP-FAL-001", qty: 20, status: "PENDING", day: 1, note: "Stock actual: 0" },
    { sku: "TOP-BRA-001", qty: 15, status: "PENDING", day: 1, note: "Stock actual: 1" },
    { sku: "TOP-ZAP-002", qty: 10, status: "PENDING", day: 0, note: "Stock actual: 3" },
    { sku: "TOP-JEA-002", qty: 12, status: "APPROVED", day: 6 },
    { sku: "TOP-GOR-001", qty: 10, status: "APPROVED", day: 8 },
    { sku: "TOP-VES-001", qty: 5, status: "REJECTED", day: 9, note: "Aún hay stock suficiente" },
  ];
  for (const r of reqDef) {
    const p = P(r.sku);
    await prisma.stockRequest.create({
      data: { productId: p.id, requestedBy: sellerName, quantityRequested: r.qty, status: r.status, note: r.note ?? null, createdAt: at(r.day, 10) },
    });
  }
  console.log(`📨 ${reqDef.length} solicitudes de reposición creadas (3 pendientes).`);

  // 8) Devoluciones (vinculadas a ventas reales; 1 pendiente para la campana).
  const returnsDef: { saleIndex: number; reason: string; status: Status; qty?: number }[] = [
    { saleIndex: 1, reason: "Talla incorrecta", status: "PENDING" },
    { saleIndex: 3, reason: "Producto con defecto de costura", status: "APPROVED" },
    { saleIndex: 5, reason: "No era el color esperado", status: "APPROVED" },
    { saleIndex: 9, reason: "Cliente se arrepintió de la compra", status: "REJECTED" },
  ];
  let retCount = 0;
  for (const r of returnsDef) {
    const sale = createdSales[r.saleIndex];
    if (!sale || sale.items.length === 0) continue;
    const item = sale.items[0];
    await prisma.productReturn.create({
      data: {
        productId: item.productId,
        saleId: sale.id,
        quantity: r.qty ?? 1,
        reason: r.reason,
        status: r.status,
        processedBy: r.status === "PENDING" ? null : adminName,
        createdAt: at(Math.max(0, 11 - r.saleIndex), 16),
      },
    });
    retCount++;
  }
  console.log(`↩️  ${retCount} devoluciones creadas (1 pendiente).`);

  // 9) Promociones (activas, por categoría, por producto, y una vencida).
  await prisma.promotion.create({ data: { name: "Descuento de verano 20%", description: "20% en toda la línea de Ropa", discountType: "PERCENTAGE", discountValue: 20, category: "Ropa", startDate: at(5), endDate: at(-20), isActive: true, createdBy: adminName } });
  await prisma.promotion.create({ data: { name: "Liquidación de calzado", description: "15% en Calzado seleccionado", discountType: "PERCENTAGE", discountValue: 15, category: "Calzado", startDate: at(3), endDate: at(-15), isActive: true, createdBy: adminName } });
  await prisma.promotion.create({ data: { name: "Polo básico -S/.10", description: "S/. 10 de descuento en el polo básico", discountType: "FIXED", discountValue: 10, productId: P("TOP-POL-001").id, startDate: at(2), endDate: at(-25), isActive: true, createdBy: adminName } });
  await prisma.promotion.create({ data: { name: "Accesorios 10%", description: "10% en Accesorios", discountType: "PERCENTAGE", discountValue: 10, category: "Accesorios", startDate: at(1), endDate: at(-30), isActive: true, createdBy: adminName } });
  await prisma.promotion.create({ data: { name: "Black Friday 30%", description: "Promo vencida (demo)", discountType: "PERCENTAGE", discountValue: 30, startDate: at(45), endDate: at(10), isActive: true, createdBy: adminName } });
  console.log("🏷️  5 promociones creadas (4 vigentes, 1 vencida).");

  console.log("\n✅ Seed completado con datos realistas en todas las secciones.");
}

main()
  .catch((e) => {
    console.error("❌ Error en el seed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
