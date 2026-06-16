"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Banknote, Package, PackagePlus, ReceiptText, RotateCcw, ShoppingCart, TrendingUp } from "lucide-react";
import { getDashboardStats, getReturns, type DashboardStats, type ProductReturn } from "@/frontend/lib/dashboard/api";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:3001";

type Sale = {
  id: string;
  total: number;
  paymentMethod: string | null;
  customerName: string | null;
  createdAt: string;
  items: { quantity: number; price: number; product: { name: string } }[];
};

type StockEntry = {
  id: string;
  quantity: number;
  createdAt: string;
  product: { name: string; category: string };
};

const paymentLabels: Record<string, string> = {
  efectivo: "Efectivo",
  tarjeta_debito: "Debito",
  tarjeta_credito: "Credito",
  yape: "Yape",
  plin: "Plin",
  transferencia: "Transfer.",
  qr: "QR",
  billetera_digital: "Wallet",
};

export default function DashboardPage() {
  const router = useRouter();
  const [role, setRole] = useState<"ADMIN" | "USER" | null>(null);
  const [userName, setUserName] = useState("");
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [sales, setSales] = useState<Sale[]>([]);
  const [stockEntries, setStockEntries] = useState<StockEntry[]>([]);
  const [returns, setReturns] = useState<ProductReturn[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    try {
      const user = JSON.parse(localStorage.getItem("top-modas-user") || "{}") as { role?: "ADMIN" | "USER"; name?: string; email?: string };
      setRole(user.role === "ADMIN" ? "ADMIN" : "USER");
      setUserName(user.name || user.email || "");
    } catch {
      setRole("USER");
    }

    Promise.all([
      getDashboardStats(),
      fetch(`${BACKEND_URL}/api/sales`).then((r) => r.json()),
      fetch(`${BACKEND_URL}/api/stock-entries`).then((r) => r.json()),
      getReturns(),
    ])
      .then(([dashboardStats, salesData, entryData, returnsData]) => {
        setStats(dashboardStats);
        setSales(Array.isArray(salesData) ? salesData : []);
        setStockEntries(Array.isArray(entryData) ? entryData : []);
        setReturns(Array.isArray(returnsData) ? returnsData : []);
      })
      .catch(() => setError("No se pudo conectar con el servidor"))
      .finally(() => setLoading(false));
  }, []);

  const totalRevenue = sales.reduce((sum, sale) => sum + sale.total, 0);
  const avgTicket = sales.length ? totalRevenue / sales.length : 0;
  const totalUnits = sales.reduce((sum, sale) => sum + sale.items.reduce((s, item) => s + item.quantity, 0), 0);
  const stockUnitsAdded = stockEntries.reduce((sum, entry) => sum + entry.quantity, 0);
  const pendingReturns = returns.filter((r) => r.status === "PENDING").length;
  const returnedUnits = returns.filter((r) => r.status === "APPROVED").reduce((sum, r) => sum + r.quantity, 0);

  const paymentSummary = useMemo(() => {
    const grouped = sales.reduce<Record<string, number>>((acc, sale) => {
      const method = sale.paymentMethod || "efectivo";
      acc[method] = (acc[method] || 0) + sale.total;
      return acc;
    }, {});
    return Object.entries(grouped)
      .map(([method, amount]) => ({ method, amount }))
      .sort((a, b) => b.amount - a.amount);
  }, [sales]);

  const topProducts = useMemo(() => {
    const grouped = sales.reduce<Record<string, { name: string; quantity: number; revenue: number }>>((acc, sale) => {
      sale.items.forEach((item) => {
        const name = item.product.name;
        acc[name] = acc[name] || { name, quantity: 0, revenue: 0 };
        acc[name].quantity += item.quantity;
        acc[name].revenue += item.quantity * item.price;
      });
      return acc;
    }, {});
    return Object.values(grouped).sort((a, b) => b.quantity - a.quantity).slice(0, 5);
  }, [sales]);

  if (role === null) {
    return <div className="py-10 text-center text-sm text-gray-400">Verificando permisos...</div>;
  }

  if (role !== "ADMIN") {
    return (
      <AccessDenied
        title="Acceso restringido"
        message="Tu usuario vendedor no puede entrar al dashboard principal. Usa Caja para registrar ventas."
        actionLabel="Ir a Caja"
        onAction={() => router.push("/dashboard/caja")}
      />
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">¡Bienvenido{userName ? `, ${userName}` : ""}! 👋</h1>
          <p className="text-sm text-gray-500">Resumen operativo de ventas, inventario y pagos.</p>
        </div>
        <button
          onClick={() => router.push("/dashboard/caja")}
          className="rounded-lg bg-gradient-to-r from-pink-600 to-rose-600 px-5 py-2.5 text-sm font-bold text-white shadow-md hover:from-pink-700 hover:to-rose-700"
        >
          ABRIR CAJA
        </button>
      </div>

      {error && <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={<Package className="h-5 w-5 text-pink-600" />} label="Productos" value={loading ? "..." : (stats?.totalProducts ?? 0).toString()} />
        <StatCard icon={<TrendingUp className="h-5 w-5 text-emerald-600" />} label="Ingresos" value={loading ? "..." : `S/. ${totalRevenue.toFixed(2)}`} />
        <StatCard icon={<ReceiptText className="h-5 w-5 text-blue-600" />} label="Ventas" value={loading ? "..." : sales.length.toString()} />
        <StatCard icon={<ShoppingCart className="h-5 w-5 text-purple-600" />} label="Unidades" value={loading ? "..." : totalUnits.toString()} />
        <StatCard icon={<AlertTriangle className="h-5 w-5 text-red-500" />} label="Agotados" value={loading ? "..." : (stats?.outOfStock ?? 0).toString()} />
        <StatCard icon={<PackagePlus className="h-5 w-5 text-amber-600" />} label="Stock nuevo" value={loading ? "..." : stockUnitsAdded.toString()} />
        <StatCard icon={<RotateCcw className="h-5 w-5 text-rose-500" />} label="Devoluciones" value={loading ? "..." : returns.length.toString()} />
        <StatCard icon={<RotateCcw className="h-5 w-5 text-yellow-600" />} label="Devol. pend." value={loading ? "..." : pendingReturns.toString()} />
      </div>

      <div className="grid gap-5 xl:grid-cols-[1fr_380px]">
        <div className="rounded-lg bg-white p-5 shadow-sm ring-1 ring-gray-100">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-bold text-gray-900">Ingresos por metodo de pago</h2>
            <span className="text-sm font-bold text-pink-700">Ticket prom. S/. {avgTicket.toFixed(2)}</span>
          </div>
          <div className="space-y-3">
            {paymentSummary.length === 0 ? (
              <p className="py-8 text-center text-sm text-gray-400">Sin ventas registradas</p>
            ) : (
              paymentSummary.map((item) => {
                const percent = totalRevenue > 0 ? (item.amount / totalRevenue) * 100 : 0;
                return (
                  <div key={item.method}>
                    <div className="mb-1 flex justify-between text-sm">
                      <span className="font-semibold text-gray-700">{paymentLabels[item.method] || item.method}</span>
                      <span className="font-bold text-gray-900">S/. {item.amount.toFixed(2)}</span>
                    </div>
                    <div className="h-3 rounded-full bg-gray-100">
                      <div className="h-3 rounded-full bg-pink-500" style={{ width: `${Math.max(4, percent)}%` }} />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className="rounded-lg bg-white p-5 shadow-sm ring-1 ring-gray-100">
          <div className="mb-4 flex items-center gap-2">
            <Banknote className="h-5 w-5 text-pink-600" />
            <h2 className="font-bold text-gray-900">Top productos</h2>
          </div>
          <div className="space-y-3">
            {topProducts.length === 0 ? (
              <p className="py-8 text-center text-sm text-gray-400">Sin productos vendidos</p>
            ) : (
              topProducts.map((product, index) => (
                <div key={product.name} className="flex items-center justify-between rounded-md border border-gray-100 px-3 py-2">
                  <div>
                    <p className="text-sm font-bold text-gray-800">{index + 1}. {product.name}</p>
                    <p className="text-xs text-gray-400">{product.quantity} unidades</p>
                  </div>
                  <span className="text-sm font-bold text-pink-700">S/. {product.revenue.toFixed(2)}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <div className="rounded-lg bg-white p-5 shadow-sm ring-1 ring-gray-100">
          <div className="mb-4 flex items-center gap-2">
            <PackagePlus className="h-5 w-5 text-amber-600" />
            <h2 className="font-bold text-gray-900">Entradas recientes de stock</h2>
          </div>
          <div className="space-y-3">
            {stockEntries.length === 0 ? (
              <p className="py-8 text-center text-sm text-gray-400">Sin entradas registradas</p>
            ) : (
              stockEntries.slice(0, 5).map((entry) => (
                <div key={entry.id} className="flex items-center justify-between rounded-md border border-gray-100 px-3 py-2">
                  <div>
                    <p className="text-sm font-bold text-gray-800">{entry.product.name}</p>
                    <p className="text-xs text-gray-400">{new Date(entry.createdAt).toLocaleDateString("es-PE")} - {entry.product.category}</p>
                  </div>
                  <span className="rounded-md bg-amber-50 px-2 py-1 text-sm font-bold text-amber-700">+{entry.quantity}</span>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="rounded-lg bg-white p-5 shadow-sm ring-1 ring-gray-100">
          <h2 className="mb-4 font-bold text-gray-900">Pulso de operacion</h2>
          <div className="grid grid-cols-2 gap-3">
            <MiniMetric label="Ticket" value={`S/. ${avgTicket.toFixed(2)}`} />
            <MiniMetric label="Unidades" value={totalUnits.toString()} />
            <MiniMetric label="Stock +" value={stockUnitsAdded.toString()} />
            <MiniMetric label="Devol. (uds.)" value={returnedUnits.toString()} />
          </div>
          <div className="mt-5 h-24 rounded-md bg-gradient-to-r from-pink-50 via-white to-rose-50 p-4">
            <p className="text-xs font-bold uppercase tracking-wide text-gray-500">Balance visual</p>
            <div className="mt-3 flex h-3 overflow-hidden rounded-full bg-gray-100">
              <div className="bg-pink-500" style={{ width: `${sales.length ? 50 : 8}%` }} />
              <div className="bg-amber-400" style={{ width: `${stockEntries.length ? 30 : 8}%` }} />
              <div className="bg-rose-400" style={{ width: `${returns.length ? 12 : 0}%` }} />
              <div className="bg-emerald-500" style={{ width: "8%" }} />
            </div>
            <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-gray-500">
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-pink-500" />Ventas</span>
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-amber-400" />Stock</span>
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-rose-400" />Devol.</span>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-lg bg-white shadow-sm ring-1 ring-gray-100">
        <div className="border-b border-gray-100 px-5 py-4">
          <h2 className="font-bold text-gray-900">Inventario reciente</h2>
        </div>
        {loading ? (
          <div className="px-6 py-8 text-center text-sm text-gray-400">Cargando...</div>
        ) : stats?.recentProducts.length === 0 ? (
          <div className="px-6 py-8 text-center text-sm text-gray-400">No hay productos registrados.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-pink-50 text-pink-700">
              <tr>
                <th className="px-5 py-3 text-left font-medium">Producto</th>
                <th className="px-5 py-3 text-left font-medium">Categoria</th>
                <th className="px-5 py-3 text-left font-medium">Talla/Color</th>
                <th className="px-5 py-3 text-right font-medium">Stock</th>
                <th className="px-5 py-3 text-right font-medium">Precio</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {stats?.recentProducts.map((product) => (
                <tr key={product.id} className="transition-colors hover:bg-pink-50/50">
                  <td className="px-5 py-3 font-semibold text-gray-800">{product.name}</td>
                  <td className="px-5 py-3 text-gray-500">{product.category}</td>
                  <td className="px-5 py-3 text-gray-500">{product.size || "-"} / {product.color || "-"}</td>
                  <td className="px-5 py-3 text-right font-bold text-gray-700">{product.stock}</td>
                  <td className="px-5 py-3 text-right text-gray-700">S/. {product.price.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function AccessDenied({ title, message, actionLabel, onAction }: { title: string; message: string; actionLabel: string; onAction: () => void }) {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="max-w-md rounded-lg bg-white p-8 text-center shadow-sm ring-1 ring-gray-100">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-amber-100">
          <AlertTriangle className="h-7 w-7 text-amber-600" />
        </div>
        <h1 className="text-xl font-bold text-gray-900">{title}</h1>
        <p className="mt-2 text-sm text-gray-500">{message}</p>
        <button onClick={onAction} className="mt-5 rounded-md bg-pink-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-pink-700">
          {actionLabel}
        </button>
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
        <p className="text-xl font-bold text-gray-900">{value}</p>
      </div>
    </div>
  );
}

function MiniMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-gray-50 p-3 text-center">
      <p className="text-xs uppercase tracking-wide text-gray-500">{label}</p>
      <p className="mt-1 text-lg font-bold text-gray-900">{value}</p>
    </div>
  );
}
