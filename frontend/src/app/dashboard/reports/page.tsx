"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Banknote, DollarSign, PackagePlus, ReceiptText, Search, TrendingUp } from "lucide-react";
import { getDashboardStats, type DashboardStats } from "@/frontend/lib/dashboard/api";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:3001";

type Sale = {
  id: string;
  total: number;
  customerName: string | null;
  customerDni: string | null;
  customerEmail: string | null;
  paymentMethod: string | null;
  paymentStatus: string | null;
  transactionReference: string | null;
  amountPaid: number | null;
  changeAmount: number | null;
  createdAt: string;
  items: { quantity: number; price: number; product: { name: string } }[];
};

type StockEntry = {
  id: string;
  quantity: number;
  previousStock: number;
  newStock: number;
  note: string | null;
  createdAt: string;
  product: {
    name: string;
    sku: string | null;
    category: string;
  };
};

const paymentLabels: Record<string, string> = {
  efectivo: "Efectivo",
  tarjeta_debito: "Debito",
  tarjeta_credito: "Credito",
  yape: "Yape",
  plin: "Plin",
  transferencia: "Transferencia",
  qr: "QR",
  billetera_digital: "Wallet",
};

export default function ReportsPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [sales, setSales] = useState<Sale[]>([]);
  const [stockEntries, setStockEntries] = useState<StockEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [paymentFilter, setPaymentFilter] = useState("todos");

  useEffect(() => {
    Promise.all([
      getDashboardStats(),
      fetch(`${BACKEND_URL}/api/sales`).then((r) => r.json()),
      fetch(`${BACKEND_URL}/api/stock-entries`).then((r) => r.json()),
    ])
      .then(([s, v, entries]) => {
        setStats(s);
        setSales(Array.isArray(v) ? v : []);
        setStockEntries(Array.isArray(entries) ? entries : []);
      })
      .finally(() => setLoading(false));
  }, []);

  const filteredSales = useMemo(() => {
    const q = searchTerm.toLowerCase().trim();
    return sales.filter((sale) => {
      const payment = sale.paymentMethod || "efectivo";
      const detail = sale.items.map((item) => item.product.name).join(" ").toLowerCase();
      const matchesSearch =
        sale.id.toLowerCase().includes(q) ||
        (sale.customerName || "").toLowerCase().includes(q) ||
        (sale.customerDni || "").includes(q) ||
        detail.includes(q);
      const matchesPayment = paymentFilter === "todos" || payment === paymentFilter;
      return matchesSearch && matchesPayment;
    });
  }, [sales, searchTerm, paymentFilter]);

  const totalSalesAmount = filteredSales.reduce((sum, sale) => sum + sale.total, 0);
  const avgTicket = filteredSales.length > 0 ? totalSalesAmount / filteredSales.length : 0;
  const electronicSales = filteredSales.filter((sale) => (sale.paymentMethod || "efectivo") !== "efectivo").length;
  const totalStockAdded = stockEntries.reduce((sum, entry) => sum + entry.quantity, 0);

  if (loading) return <div className="py-10 text-center text-gray-400">Cargando reportes...</div>;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Reportes</h1>
        <p className="text-sm text-gray-500">Historial de ventas con pago, cliente y detalle de productos.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-6">
        <StatCard icon={<DollarSign className="h-5 w-5 text-emerald-600" />} label="Ingresos" value={`S/. ${totalSalesAmount.toFixed(2)}`} />
        <StatCard icon={<TrendingUp className="h-5 w-5 text-blue-600" />} label="Ventas" value={filteredSales.length.toString()} />
        <StatCard icon={<ReceiptText className="h-5 w-5 text-pink-600" />} label="Ticket prom." value={`S/. ${avgTicket.toFixed(2)}`} />
        <StatCard icon={<Banknote className="h-5 w-5 text-purple-600" />} label="Pagos digitales" value={electronicSales.toString()} />
        <StatCard icon={<PackagePlus className="h-5 w-5 text-amber-600" />} label="Stock ingresado" value={totalStockAdded.toString()} />
        <StatCard icon={<AlertTriangle className="h-5 w-5 text-red-500" />} label="Agotados" value={(stats?.outOfStock ?? 0).toString()} />
      </div>

      <div className="rounded-lg bg-white shadow-sm ring-1 ring-gray-100">
        <div className="grid gap-3 border-b border-gray-100 p-4 md:grid-cols-[1fr_220px]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Buscar cliente, DNI, producto o venta..."
              className="w-full rounded-md border border-gray-200 py-2 pl-10 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-pink-400"
            />
          </div>
          <select
            value={paymentFilter}
            onChange={(event) => setPaymentFilter(event.target.value)}
            className="rounded-md border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-400"
          >
            <option value="todos">Todos los pagos</option>
            {Object.entries(paymentLabels).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </div>

        {filteredSales.length === 0 ? (
          <div className="px-6 py-10 text-center text-sm text-gray-400">No hay ventas con esos filtros</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-pink-50 text-pink-700">
                <tr>
                  <th className="px-5 py-3 text-left font-medium">Fecha</th>
                  <th className="px-5 py-3 text-left font-medium">Cliente</th>
                  <th className="px-5 py-3 text-left font-medium">Tipo de venta</th>
                  <th className="px-5 py-3 text-left font-medium">Pago</th>
                  <th className="px-5 py-3 text-left font-medium">Detalle</th>
                  <th className="px-5 py-3 text-right font-medium">Total</th>
                  <th className="px-5 py-3 text-right font-medium">Vuelto</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredSales.map((sale) => {
                  const payment = sale.paymentMethod || "efectivo";
                  const itemCount = sale.items.reduce((sum, item) => sum + item.quantity, 0);
                  return (
                    <tr key={sale.id} className="transition-colors hover:bg-pink-50/40">
                      <td className="px-5 py-3 text-xs text-gray-500">
                        {new Date(sale.createdAt).toLocaleDateString("es-PE", {
                          day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit"
                        })}
                      </td>
                      <td className="px-5 py-3">
                        <p className="font-semibold text-gray-800">{sale.customerName || "Cliente generico"}</p>
                        <p className="text-xs text-gray-400">{sale.customerDni || sale.customerEmail || "Sin datos"}</p>
                      </td>
                      <td className="px-5 py-3">
                        <span className={`rounded-full px-2 py-1 text-xs font-bold ${
                          sale.customerDni ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-600"
                        }`}>
                          {sale.customerDni ? "Con cliente" : "Sin cliente"}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <p className="font-semibold text-gray-800">{paymentLabels[payment] || payment}</p>
                        <p className="text-xs text-gray-400">{sale.transactionReference || sale.paymentStatus || "Caja"}</p>
                      </td>
                      <td className="px-5 py-3 text-gray-600">
                        <p className="font-semibold">{itemCount} unid.</p>
                        <p className="max-w-[260px] truncate text-xs text-gray-400">
                          {sale.items.map((item) => `${item.quantity}x ${item.product.name}`).join(", ")}
                        </p>
                      </td>
                      <td className="px-5 py-3 text-right font-bold text-pink-700">S/. {sale.total.toFixed(2)}</td>
                      <td className="px-5 py-3 text-right font-semibold text-emerald-700">S/. {(sale.changeAmount || 0).toFixed(2)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="rounded-lg bg-white shadow-sm ring-1 ring-gray-100">
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
          <div>
            <h2 className="font-bold text-gray-900">Historial de entradas de stock</h2>
            <p className="text-xs text-gray-500">Movimientos registrados desde Añadir Producto.</p>
          </div>
          <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700">
            {stockEntries.length} entradas
          </span>
        </div>

        {stockEntries.length === 0 ? (
          <div className="px-6 py-8 text-center text-sm text-gray-400">Todavia no hay entradas nuevas de stock</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-amber-50 text-amber-700">
                <tr>
                  <th className="px-5 py-3 text-left font-medium">Fecha</th>
                  <th className="px-5 py-3 text-left font-medium">Producto</th>
                  <th className="px-5 py-3 text-left font-medium">Categoria</th>
                  <th className="px-5 py-3 text-right font-medium">Entrada</th>
                  <th className="px-5 py-3 text-right font-medium">Stock anterior</th>
                  <th className="px-5 py-3 text-right font-medium">Stock final</th>
                  <th className="px-5 py-3 text-left font-medium">Nota</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {stockEntries.map((entry) => (
                  <tr key={entry.id} className="transition-colors hover:bg-amber-50/40">
                    <td className="px-5 py-3 text-xs text-gray-500">
                      {new Date(entry.createdAt).toLocaleDateString("es-PE", {
                        day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit"
                      })}
                    </td>
                    <td className="px-5 py-3">
                      <p className="font-semibold text-gray-800">{entry.product.name}</p>
                      <p className="text-xs text-gray-400">{entry.product.sku || "Sin SKU"}</p>
                    </td>
                    <td className="px-5 py-3 text-gray-500">{entry.product.category}</td>
                    <td className="px-5 py-3 text-right font-bold text-amber-700">+{entry.quantity}</td>
                    <td className="px-5 py-3 text-right text-gray-600">{entry.previousStock}</td>
                    <td className="px-5 py-3 text-right font-bold text-gray-900">{entry.newStock}</td>
                    <td className="px-5 py-3 text-gray-500">{entry.note || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-pink-100 bg-white p-4 shadow-sm">
      <div className="rounded-md bg-pink-50 p-3">{icon}</div>
      <div>
        <p className="text-xs uppercase tracking-wide text-gray-500">{label}</p>
        <p className="text-lg font-bold text-gray-900">{value}</p>
      </div>
    </div>
  );
}
