"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Banknote, DollarSign, PackagePlus, ReceiptText, RotateCcw, Search, TrendingUp } from "lucide-react";
import { getDashboardStats, getReturns, type DashboardStats, type ProductReturn, type Sale } from "@/frontend/lib/dashboard/api";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:3001";

type StockEntry = {
  id: string;
  quantity: number;
  previousStock: number;
  newStock: number;
  note: string | null;
  createdAt: string;
  product: { name: string; sku: string | null; category: string };
};

const paymentLabels: Record<string, string> = {
  efectivo: "Efectivo",
  tarjeta_debito: "Débito",
  tarjeta_credito: "Crédito",
  yape: "Yape",
  plin: "Plin",
  transferencia: "Transferencia",
  qr: "QR",
  billetera_digital: "Wallet",
};

const paymentColors: Record<string, string> = {
  efectivo: "bg-emerald-500",
  tarjeta_debito: "bg-blue-500",
  tarjeta_credito: "bg-purple-500",
  yape: "bg-pink-500",
  plin: "bg-cyan-500",
  transferencia: "bg-amber-500",
  qr: "bg-orange-500",
  billetera_digital: "bg-indigo-500",
};

const paymentHexColors: Record<string, string> = {
  efectivo: "#10b981",
  tarjeta_debito: "#3b82f6",
  tarjeta_credito: "#8b5cf6",
  yape: "#ec4899",
  plin: "#06b6d4",
  transferencia: "#f59e0b",
  qr: "#f97316",
  billetera_digital: "#6366f1",
};

const saleNumber = (sale: Pick<Sale, "id" | "receiptNumber">) => sale.receiptNumber || `#${sale.id.slice(0, 8)}`;

const RETURN_STATUS_LABEL: Record<ProductReturn["status"], string> = { PENDING: "Pendiente", APPROVED: "Aprobada", REJECTED: "Rechazada" };
const RETURN_STATUS_COLOR: Record<ProductReturn["status"], string> = {
  PENDING: "bg-yellow-100 text-yellow-800",
  APPROVED: "bg-emerald-100 text-emerald-700",
  REJECTED: "bg-red-100 text-red-700",
};
const returnSaleNumber = (item: ProductReturn) => item.sale?.receiptNumber || (item.saleId ? `#${item.saleId.slice(0, 8)}` : "-");

function getLast7Days(): string[] {
  const days: string[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(d.toISOString().split("T")[0]);
  }
  return days;
}

function dayLabel(isoDate: string) {
  const d = new Date(isoDate + "T00:00:00");
  return d.toLocaleDateString("es-PE", { weekday: "short", day: "2-digit" });
}

export default function ReportsPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [sales, setSales] = useState<Sale[]>([]);
  const [stockEntries, setStockEntries] = useState<StockEntry[]>([]);
  const [returns, setReturns] = useState<ProductReturn[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [paymentFilter, setPaymentFilter] = useState("todos");
  const [activeTab, setActiveTab] = useState<"ventas" | "stock" | "devoluciones">("ventas");

  useEffect(() => {
    Promise.all([
      getDashboardStats(),
      fetch(`${BACKEND_URL}/api/sales`).then((r) => r.json()),
      fetch(`${BACKEND_URL}/api/stock-entries`).then((r) => r.json()),
      getReturns(),
    ])
      .then(([s, v, entries, ret]) => {
        setStats(s);
        setSales(Array.isArray(v) ? v : []);
        setStockEntries(Array.isArray(entries) ? entries : []);
        setReturns(Array.isArray(ret) ? ret : []);
      })
      .finally(() => setLoading(false));
  }, []);

  const filteredSales = useMemo(() => {
    const q = searchTerm.toLowerCase().trim();
    return sales.filter((sale) => {
      const payment = sale.paymentMethod || "efectivo";
      const detail = sale.items.map((item) => `${item.product.name} ${item.product.sku || ""}`).join(" ").toLowerCase();
      const matchesSearch =
        sale.id.toLowerCase().includes(q) ||
        (sale.receiptNumber || "").toLowerCase().includes(q) ||
        (sale.customerName || "").toLowerCase().includes(q) ||
        (sale.customerDni || "").includes(q) ||
        detail.includes(q);
      return matchesSearch && (paymentFilter === "todos" || payment === paymentFilter);
    });
  }, [sales, searchTerm, paymentFilter]);

  const totalSalesAmount = filteredSales.reduce((sum, sale) => sum + sale.total, 0);
  const avgTicket = filteredSales.length > 0 ? totalSalesAmount / filteredSales.length : 0;
  const electronicSales = filteredSales.filter((s) => (s.paymentMethod || "efectivo") !== "efectivo").length;
  const totalStockAdded = stockEntries.reduce((sum, e) => sum + e.quantity, 0);
  const pendingReturns = returns.filter((r) => r.status === "PENDING").length;
  const approvedReturnUnits = returns.filter((r) => r.status === "APPROVED").reduce((sum, r) => sum + r.quantity, 0);

  const paymentDist = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredSales.forEach((s) => { const p = s.paymentMethod || "efectivo"; counts[p] = (counts[p] || 0) + 1; });
    const total = filteredSales.length;
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).map(([key, count]) => ({ key, label: paymentLabels[key] || key, count, pct: total > 0 ? (count / total) * 100 : 0 }));
  }, [filteredSales]);

  const topProducts = useMemo(() => {
    const revenue: Record<string, { name: string; total: number; qty: number }> = {};
    filteredSales.forEach((sale) => {
      sale.items.forEach((item) => {
        const id = item.product.id;
        if (!revenue[id]) revenue[id] = { name: item.product.name, total: 0, qty: 0 };
        revenue[id].total += item.price * item.quantity;
        revenue[id].qty += item.quantity;
      });
    });
    return Object.values(revenue).sort((a, b) => b.total - a.total).slice(0, 6);
  }, [filteredSales]);

  const last7 = useMemo(() => {
    const days = getLast7Days();
    return days.map((day) => {
      const daySales = sales.filter((s) => s.createdAt.startsWith(day));
      return { day, label: dayLabel(day), count: daySales.length, total: daySales.reduce((sum, s) => sum + s.total, 0) };
    });
  }, [sales]);

  const maxDayTotal = Math.max(...last7.map((d) => d.total), 1);
  const maxProductRevenue = topProducts.length > 0 ? topProducts[0].total : 1;

  if (loading) return <div className="py-10 text-center text-gray-700">Cargando reportes...</div>;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Reportes</h1>
        <p className="text-sm text-gray-700">Análisis de ventas, pagos y movimientos de stock.</p>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-7">
        <StatCard icon={<DollarSign className="h-5 w-5 text-emerald-600" />} label="Ingresos" value={`S/. ${totalSalesAmount.toFixed(2)}`} />
        <StatCard icon={<TrendingUp className="h-5 w-5 text-blue-600" />} label="Ventas" value={filteredSales.length.toString()} />
        <StatCard icon={<ReceiptText className="h-5 w-5 text-pink-600" />} label="Ticket prom." value={`S/. ${avgTicket.toFixed(2)}`} />
        <StatCard icon={<Banknote className="h-5 w-5 text-purple-600" />} label="Pagos digitales" value={electronicSales.toString()} />
        <StatCard icon={<PackagePlus className="h-5 w-5 text-amber-600" />} label="Stock ingresado" value={totalStockAdded.toString()} />
        <StatCard icon={<AlertTriangle className="h-5 w-5 text-red-500" />} label="Agotados" value={(stats?.outOfStock ?? 0).toString()} />
        <StatCard icon={<RotateCcw className="h-5 w-5 text-rose-500" />} label="Devoluciones" value={returns.length.toString()} />
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <div className="rounded-lg bg-white p-5 shadow-sm ring-1 ring-gray-100">
          <h2 className="mb-4 font-bold text-gray-800">Métodos de pago</h2>
          {paymentDist.length === 0 ? (
            <p className="text-sm text-gray-700">Sin datos</p>
          ) : (
            <div className="grid items-center gap-4 sm:grid-cols-[120px_1fr]">
              <PaymentDonut data={paymentDist} />
              <div className="space-y-2">
              {paymentDist.map(({ key, label, count, pct }) => (
                <div key={key} className="flex items-center gap-2 text-xs">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: paymentHexColors[key] || "#9ca3af" }} />
                  <span className="flex-1 font-medium text-gray-700">{label}</span>
                    <span className="text-gray-700">{count} ({pct.toFixed(0)}%)</span>
                </div>
              ))}
              </div>
            </div>
          )}
        </div>

        <div className="rounded-lg bg-white p-5 shadow-sm ring-1 ring-gray-100">
          <h2 className="mb-4 font-bold text-gray-800">Top productos</h2>
          {topProducts.length === 0 ? (
            <p className="text-sm text-gray-700">Sin datos</p>
          ) : (
            <div className="space-y-3">
              {topProducts.map((p) => (
                <div key={p.name}>
                  <div className="mb-1 flex justify-between text-xs">
                    <span className="max-w-[60%] truncate font-medium text-gray-700">{p.name}</span>
                    <span className="text-gray-700">S/. {p.total.toFixed(0)} · {p.qty} uds.</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
                    <div className="h-full rounded-full bg-pink-500" style={{ width: `${(p.total / maxProductRevenue) * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-lg bg-white p-5 shadow-sm ring-1 ring-gray-100 md:col-span-2 xl:col-span-1">
          <h2 className="mb-4 font-bold text-gray-800">Ventas últimos 7 días</h2>
          <SalesTrendChart data={last7} maxTotal={maxDayTotal} />
        </div>
      </div>

      <div className="rounded-lg bg-white shadow-sm ring-1 ring-gray-100">
        <div className="flex gap-1 border-b border-gray-100 px-4 pt-3" role="tablist">
          {(["ventas", "stock", "devoluciones"] as const).map((tab) => {
            const tabLabel = tab === "ventas" ? "Historial de ventas" : tab === "stock" ? "Entradas de stock" : "Devoluciones";
            return (
              <button key={tab} onClick={() => setActiveTab(tab)} aria-label={`Ver ${tabLabel}`} role="tab" aria-selected={activeTab === tab} className={`rounded-t-md px-4 py-2 text-sm font-semibold capitalize transition-colors ${activeTab === tab ? "border-b-2 border-pink-500 text-pink-700" : "text-gray-700 hover:text-gray-900"}`}>
                {tabLabel}
              </button>
            );
          })}
        </div>

        {activeTab === "ventas" && (
          <>
            <div className="grid gap-3 border-b border-gray-100 p-4 md:grid-cols-[1fr_220px]">
              <div className="relative">
                <label htmlFor="search-sales" className="sr-only">Buscar ventas</label>
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-600" />
                <input id="search-sales" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Buscar cliente, DNI, numero de venta, producto o SKU..." className="w-full rounded-md border border-gray-300 py-2 pl-10 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-pink-400" />
              </div>
              <div>
                <label htmlFor="payment-filter" className="sr-only">Filtrar por método de pago</label>
                <select id="payment-filter" value={paymentFilter} onChange={(e) => setPaymentFilter(e.target.value)} className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-400">
                  <option value="todos">Todos los pagos</option>
                  {Object.entries(paymentLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
              </div>
            </div>
            {filteredSales.length === 0 ? (
              <div className="px-6 py-10 text-center text-sm text-gray-700">No hay ventas con esos filtros</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-pink-50 text-pink-700">
                    <tr>
                      <th className="px-5 py-3 text-left font-medium">Fecha</th>
                      <th className="px-5 py-3 text-left font-medium">Cliente</th>
                      <th className="px-5 py-3 text-left font-medium">Tipo</th>
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
                          <td className="px-5 py-3 text-xs text-gray-700">
                            <p>{new Date(sale.createdAt).toLocaleDateString("es-PE", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}</p>
                            <p className="font-mono text-[11px] text-gray-600">{saleNumber(sale)}</p>
                          </td>
                          <td className="px-5 py-3">
                            <p className="font-semibold text-gray-800">{sale.customerName || "Cliente genérico"}</p>
                            <p className="text-xs text-gray-700">{sale.customerDni || sale.customerEmail || "Sin datos"}</p>
                          </td>
                          <td className="px-5 py-3">
                            <span className={`rounded-full px-2 py-1 text-xs font-bold ${sale.customerDni ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-600"}`}>
                              {sale.customerDni ? "Con cliente" : "Sin cliente"}
                            </span>
                          </td>
                          <td className="px-5 py-3">
                            <div className="flex items-center gap-1.5">
                              <span className={`h-2 w-2 rounded-full ${paymentColors[payment] || "bg-gray-500"}`} />
                              <span className="font-semibold text-gray-800">{paymentLabels[payment] || payment}</span>
                            </div>
                            <p className="text-xs text-gray-700">{sale.transactionReference || sale.paymentStatus || "Caja"}</p>
                          </td>
                          <td className="px-5 py-3 text-gray-700">
                            <p className="font-semibold">{itemCount} unid.</p>
                            <p className="max-w-[240px] truncate text-xs text-gray-700">{sale.items.map((item) => `${item.quantity}x ${item.product.name}${item.product.sku ? ` (${item.product.sku})` : ""}`).join(", ")}</p>
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
          </>
        )}

        {activeTab === "stock" && (
          <>
            {stockEntries.length === 0 ? (
              <div className="px-6 py-8 text-center text-sm text-gray-700">Todavía no hay entradas de stock</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-amber-50 text-amber-700">
                    <tr>
                      <th className="px-5 py-3 text-left font-medium">Fecha</th>
                      <th className="px-5 py-3 text-left font-medium">Producto</th>
                      <th className="px-5 py-3 text-left font-medium">Categoría</th>
                      <th className="px-5 py-3 text-right font-medium">Entrada</th>
                      <th className="px-5 py-3 text-right font-medium">Stock ant.</th>
                      <th className="px-5 py-3 text-right font-medium">Stock final</th>
                      <th className="px-5 py-3 text-left font-medium">Nota</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {stockEntries.map((entry) => (
                      <tr key={entry.id} className="transition-colors hover:bg-amber-50/40">
                        <td className="px-5 py-3 text-xs text-gray-700">{new Date(entry.createdAt).toLocaleDateString("es-PE", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}</td>
                        <td className="px-5 py-3">
                          <p className="font-semibold text-gray-800">{entry.product.name}</p>
                          <p className="text-xs text-gray-700">{entry.product.sku || "Sin SKU"}</p>
                        </td>
                        <td className="px-5 py-3 text-gray-700">{entry.product.category}</td>
                        <td className="px-5 py-3 text-right font-bold text-amber-700">+{entry.quantity}</td>
                        <td className="px-5 py-3 text-right text-gray-700">{entry.previousStock}</td>
                        <td className="px-5 py-3 text-right font-bold text-gray-900">{entry.newStock}</td>
                        <td className="px-5 py-3 text-gray-700">{entry.note || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}

        {activeTab === "devoluciones" && (
          <>
            <div className="flex flex-wrap gap-2 border-b border-gray-100 px-4 py-3 text-xs">
              <span className="rounded-full bg-yellow-100 px-3 py-1 font-semibold text-yellow-800">Pendientes: {pendingReturns}</span>
              <span className="rounded-full bg-emerald-100 px-3 py-1 font-semibold text-emerald-700">Unid. reingresadas: {approvedReturnUnits}</span>
            </div>
            {returns.length === 0 ? (
              <div className="px-6 py-8 text-center text-sm text-gray-700">Todavía no hay devoluciones registradas</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-rose-50 text-rose-700">
                    <tr>
                      <th className="px-5 py-3 text-left font-medium">Fecha</th>
                      <th className="px-5 py-3 text-left font-medium">Producto</th>
                      <th className="px-5 py-3 text-left font-medium">N° Venta</th>
                      <th className="px-5 py-3 text-center font-medium">Cant.</th>
                      <th className="px-5 py-3 text-left font-medium">Motivo</th>
                      <th className="px-5 py-3 text-left font-medium">Estado</th>
                      <th className="px-5 py-3 text-left font-medium">Procesó</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {returns.map((ret) => (
                      <tr key={ret.id} className="transition-colors hover:bg-rose-50/40">
                        <td className="px-5 py-3 text-xs text-gray-700">{new Date(ret.createdAt).toLocaleDateString("es-PE", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}</td>
                        <td className="px-5 py-3">
                          <p className="font-semibold text-gray-800">{ret.product.name}</p>
                          <p className="text-xs text-gray-700">{ret.product.sku || "Sin SKU"}</p>
                        </td>
                        <td className="px-5 py-3 font-mono text-xs text-gray-700">{returnSaleNumber(ret)}</td>
                        <td className="px-5 py-3 text-center font-bold text-gray-700">{ret.quantity}</td>
                        <td className="px-5 py-3 max-w-[220px] truncate text-gray-700">{ret.reason}</td>
                        <td className="px-5 py-3">
                          <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${RETURN_STATUS_COLOR[ret.status]}`}>
                            {RETURN_STATUS_LABEL[ret.status]}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-xs text-gray-700">{ret.processedBy || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function PaymentDonut({ data }: { data: { key: string; count: number; pct: number }[] }) {
  let cursor = 0;
  const total = data.reduce((sum, item) => sum + item.count, 0);
  const gradient = data.length === 0
    ? "#f3f4f6"
    : `conic-gradient(${data.map((item) => {
        const start = cursor;
        cursor += item.pct;
        return `${paymentHexColors[item.key] || "#9ca3af"} ${start}% ${cursor}%`;
      }).join(", ")})`;

  return (
    <div className="relative h-28 w-28 rounded-full" style={{ background: gradient }}>
      <div className="absolute inset-4 flex flex-col items-center justify-center rounded-full bg-white shadow-inner">
        <span className="text-xl font-bold text-gray-900">{total}</span>
        <span className="text-[10px] font-semibold uppercase text-gray-700">ventas</span>
      </div>
    </div>
  );
}

function SalesTrendChart({ data, maxTotal }: { data: { day: string; label: string; count: number; total: number }[]; maxTotal: number }) {
  const width = 320;
  const height = 132;
  const padX = 14;
  const padY = 12;
  const usableWidth = width - padX * 2;
  const usableHeight = height - padY * 2;
  const points = data.map((item, index) => {
    const x = padX + (data.length <= 1 ? 0 : (usableWidth / (data.length - 1)) * index);
    const y = height - padY - (item.total / Math.max(maxTotal, 1)) * usableHeight;
    return { ...item, x, y };
  });
  const line = points.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`).join(" ");
  const area = points.length
    ? `${line} L ${points[points.length - 1].x} ${height - padY} L ${points[0].x} ${height - padY} Z`
    : "";

  return (
    <div className="h-44">
      <svg viewBox={`0 0 ${width} ${height}`} className="h-36 w-full overflow-visible">
        <path d={area} fill="#fce7f3" />
        <path d={line} fill="none" stroke="#db2777" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        {points.map((point) => (
          <g key={point.day}>
            <circle cx={point.x} cy={point.y} r="4" fill="#db2777" />
            <text x={point.x} y={point.y - 9} textAnchor="middle" className="fill-gray-600 text-[10px] font-bold">
              {point.count > 0 ? point.count : ""}
            </text>
          </g>
        ))}
      </svg>
      <div className="grid grid-cols-7 gap-1 text-center text-[10px] text-gray-700">
        {data.map((item) => <span key={item.day}>{item.label}</span>)}
      </div>
    </div>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-pink-100 bg-white p-4 shadow-sm">
      <div className="rounded-md bg-pink-50 p-3">{icon}</div>
      <div>
        <p className="text-xs uppercase tracking-wide text-gray-700">{label}</p>
        <p className="text-lg font-bold text-gray-900">{value}</p>
      </div>
    </div>
  );
}
