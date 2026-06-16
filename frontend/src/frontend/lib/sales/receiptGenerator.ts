import { jsPDF } from "jspdf";
import type { PaymentMethod } from "@/frontend/components/sales/PaymentMethodSelector";

interface ReceiptItem {
  name: string;
  sku?: string | null;
  quantity: number;
  price: number;
}

interface ReceiptData {
  receiptNumber: string;
  date: string;
  customerName: string;
  customerDni?: string;
  customerEmail?: string;
  items: ReceiptItem[];
  total: number;
  paymentMethod?: PaymentMethod;
  cashierName?: string;
}

const paymentLabels: Record<PaymentMethod, string> = {
  efectivo: "Efectivo",
  tarjeta_debito: "Tarjeta debito",
  tarjeta_credito: "Tarjeta credito",
  yape: "Yape",
  plin: "Plin",
  transferencia: "Transferencia",
  qr: "Pago QR",
  billetera_digital: "Billetera digital",
};

const money = (value: number) => `S/. ${value.toFixed(2)}`;

const drawQr = (pdf: jsPDF, x: number, y: number, size: number, seed: string) => {
  const cells = 21;
  const cell = size / cells;
  pdf.setFillColor(0, 0, 0);

  const finder = (fx: number, fy: number) => {
    pdf.rect(x + fx * cell, y + fy * cell, cell * 7, cell * 7, "F");
    pdf.setFillColor(255, 255, 255);
    pdf.rect(x + (fx + 1) * cell, y + (fy + 1) * cell, cell * 5, cell * 5, "F");
    pdf.setFillColor(0, 0, 0);
    pdf.rect(x + (fx + 2) * cell, y + (fy + 2) * cell, cell * 3, cell * 3, "F");
  };

  finder(0, 0);
  finder(14, 0);
  finder(0, 14);

  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;

  for (let row = 0; row < cells; row += 1) {
    for (let col = 0; col < cells; col += 1) {
      const inFinder =
        (row < 7 && col < 7) ||
        (row < 7 && col >= 14) ||
        (row >= 14 && col < 7);
      if (inFinder) continue;

      hash = (hash * 1664525 + 1013904223) >>> 0;
      if ((hash + row + col) % 3 === 0) {
        pdf.rect(x + col * cell, y + row * cell, cell, cell, "F");
      }
    }
  }
};

export function generateReceiptPDF(data: ReceiptData): void {
  const subtotal = data.total;
  const total = data.total;
  const pageWidth = 80;
  const pageHeight = Math.max(180, 135 + data.items.length * 12);
  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: [pageWidth, pageHeight],
  });

  const center = pageWidth / 2;
  const left = 5;
  const right = pageWidth - 5;
  let y = 8;

  pdf.setTextColor(20, 20, 20);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(9);
  pdf.text("TOP MODAS", center, y, { align: "center" });

  y += 7;
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(6.5);
  pdf.text("R.U.C. 20608430301", center, y, { align: "center" });
  y += 4;
  pdf.text("CENTRAL: Av. Defensores Del Morro Nro.", center, y, { align: "center" });
  y += 4;
  pdf.text("1277 Lima - Chorrillos", center, y, { align: "center" });
  y += 4;
  pdf.text("E37 - BRENA - LIMA - 1139", center, y, { align: "center" });
  y += 4;
  pdf.text("Av. Venezuela NP851", center, y, { align: "center" });

  y += 8;
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(7);
  pdf.text("BOLETA DE VENTA ELECTRONICA", center, y, { align: "center" });

  y += 8;
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(6);
  const date = new Date(data.date);
  const safeDate = Number.isNaN(date.getTime()) ? new Date() : date;
  pdf.text(`FECHA DE EMISION: ${safeDate.toLocaleDateString("es-PE")}`, left, y);
  pdf.text(new Date().toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit" }), right, y, { align: "right" });
  y += 4;
  pdf.text(`CORRELATIVO: ${data.receiptNumber}`, left, y);
  y += 4;
  pdf.text(`CAJA/TURNO: 14`, left, y);
  y += 4;
  pdf.text(`TIPO DE MONEDA: PEN`, left, y);
  y += 4;
  pdf.text(`CAJERO: ${data.cashierName || "Administrador"}`, left, y);
  y += 4;
  pdf.text(`DNI Cliente: ${data.customerDni || "-"}`, left, y);
  y += 4;
  pdf.text(`Cliente: ${data.customerName}`, left, y);
  y += 4;
  pdf.text(`Pago: ${paymentLabels[data.paymentMethod || "efectivo"]}`, left, y);

  y += 7;
  pdf.setDrawColor(30, 30, 30);
  pdf.setLineWidth(0.2);
  pdf.line(left, y, right, y);
  y += 5;

  pdf.setFont("helvetica", "bold");
  pdf.text("Descripcion:", left, y);
  pdf.text("Cantidad x precio unitario", 35, y, { align: "center" });
  pdf.text("TOTAL", right, y, { align: "right" });
  y += 4;
  pdf.line(left, y, right, y);

  y += 8;
  pdf.setFont("helvetica", "normal");
  data.items.forEach((item) => {
    const itemTotal = item.quantity * item.price;
    const description = item.sku ? `${item.name}\nSKU: ${item.sku}` : item.name;
    const lines = pdf.splitTextToSize(description, 30);
    pdf.text(lines, left, y);
    pdf.text(`${item.quantity} x ${money(item.price)}`, 43, y, { align: "center" });
    pdf.text(money(itemTotal), right, y, { align: "right" });
    y += Math.max(9, lines.length * 4);
  });

  y += 3;
  pdf.line(left, y, right, y);
  y += 6;
  pdf.text("IMPORTE TOTAL", left, y);
  pdf.text(money(subtotal), right, y, { align: "right" });
  y += 5;
  pdf.text("Importe a pagar", left, y);
  pdf.text(money(total), right, y, { align: "right" });
  y += 4;
  pdf.line(left, y, right, y);
  y += 7;

  pdf.setFont("helvetica", "bold");
  pdf.text("Total:", left, y);
  pdf.text(money(total), right, y, { align: "right" });
  y += 5;
  pdf.setFont("helvetica", "normal");
  pdf.text("Guarda tu voucher.", left, y);
  y += 4;
  pdf.text("Es el sustento para validar tu compra.", left, y);

  y += 7;
  drawQr(pdf, center - 10, y, 20, `${data.receiptNumber}-${total}`);
  y += 26;

  pdf.setFontSize(4.8);
  pdf.text("Representacion impresa de la boleta de venta electronica", center, y, { align: "center" });
  y += 3;
  pdf.text("Autorizado mediante resolucion de SUNAT", center, y, { align: "center" });
  y += 9;
  pdf.setFontSize(5);
  pdf.text("Cambios y devoluciones:", left, y);
  y += 4;
  pdf.text("Solo se aceptan por fallas de fabrica.", left, y);
  y += 4;
  pdf.text("Conserva este comprobante para cualquier reclamo.", left, y);

  pdf.save(`boleta_${data.receiptNumber}.pdf`);
}

export function generateReceiptNumber(): string {
  const now = new Date();
  const datePart = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, "0");
  return `B001-${datePart}-${random}`;
}
