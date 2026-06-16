"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckCircle, ChevronLeft, ChevronRight, ReceiptText, RotateCcw, Search, XCircle } from "lucide-react";
import { createReturn, getSales, getReturns, updateReturnStatus, type ProductReturn, type ReturnStatus, type Sale } from "@/frontend/lib/dashboard/api";

const STATUS_LABEL: Record<ReturnStatus, string> = { PENDING: "Pendiente", APPROVED: "Aprobada", REJECTED: "Rechazada" };
const STATUS_COLOR: Record<ReturnStatus, string> = {
  PENDING: "bg-yellow-100 text-yellow-800",
  APPROVED: "bg-emerald-100 text-emerald-700",
  REJECTED: "bg-red-100 text-red-700",
};

type ItemToReturn = { productId: string; name: string; sku: string | null; maxQty: number; selected: boolean; returnQty: number };

const saleNumber = (sale: Pick<Sale, "id" | "receiptNumber">) => sale.receiptNumber || `#${sale.id.slice(0, 8)}`;
const returnSaleNumber = (item: ProductReturn) => item.sale?.receiptNumber || (item.saleId ? `#${item.saleId.slice(0, 8)}` : "-");

export default function ReturnsPage() {
  const [returns, setReturns] = useState<ProductReturn[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [userName, setUserName] = useState("");

  const [step, setStep] = useState<"search" | "select">("search");
  const [saleSearch, setSaleSearch] = useState("");
  const [foundSale, setFoundSale] = useState<Sale | null>(null);
  const [items, setItems] = useState<ItemToReturn[]>([]);
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");

  useEffect(() => {
    try {
      const user = JSON.parse(localStorage.getItem("top-modas-user") || "{}") as { role?: string; name?: string };
      setIsAdmin(user.role === "ADMIN");
      setUserName(user.name ?? "");
    } catch { setIsAdmin(false); }
  }, []);

  useEffect(() => {
    Promise.all([getReturns(), getSales()])
      .then(([r, s]) => { setReturns(r); setSales(s); })
      .catch(() => setError("Error al cargar datos"))
      .finally(() => setLoading(false));
  }, []);

  const matchingSales = useMemo(() => {
    const q = saleSearch.trim().toLowerCase();
    // Sin búsqueda mostramos las ventas más recientes para no tener que recordar el número.
    if (!q) return sales.slice(0, 6);
    return sales.filter(
      (s) =>
        s.id.toLowerCase().includes(q) ||
        (s.receiptNumber || "").toLowerCase().includes(q) ||
        (s.customerName || "").toLowerCase().includes(q) ||
        (s.customerDni || "").includes(q) ||
        s.items.some((it) => it.product.name.toLowerCase().includes(q) || (it.product.sku || "").toLowerCase().includes(q))
    ).slice(0, 8);
  }, [sales, saleSearch]);

  const selectSale = (sale: Sale) => {
    const returnedByProduct = returns
      .filter((item) => item.saleId === sale.id && item.status !== "REJECTED")
      .reduce<Record<string, number>>((acc, item) => {
        acc[item.productId] = (acc[item.productId] || 0) + item.quantity;
        return acc;
      }, {});

    setFoundSale(sale);
    setSaleSearch("");
    setItems(
      sale.items.map((item) => ({
        productId: item.product.id,
        name: item.product.name,
        sku: item.product.sku,
        maxQty: Math.max(0, item.quantity - (returnedByProduct[item.product.id] || 0)),
        selected: false,
        returnQty: item.quantity - (returnedByProduct[item.product.id] || 0) > 0 ? 1 : 0,
      }))
    );
    setReason("");
    setStep("select");
  };

  const toggleItem = (idx: number) =>
    setItems((prev) => prev.map((it, i) => i === idx ? { ...it, selected: !it.selected } : it));

  const setQty = (idx: number, qty: number) =>
    setItems((prev) => prev.map((it, i) => i === idx ? { ...it, returnQty: Math.max(1, Math.min(qty, it.maxQty)) } : it));

  const selectedItems = items.filter((it) => it.selected && it.maxQty > 0);

  const handleSubmit = async () => {
    if (!foundSale || selectedItems.length === 0 || !reason.trim()) {
      setError("Selecciona al menos un producto e ingresa el motivo."); return;
    }
    setSubmitting(true); setError("");
    try {
      const newReturns = await Promise.all(
        selectedItems.map((it) =>
          createReturn({ productId: it.productId, quantity: it.returnQty, reason: reason.trim(), saleId: foundSale.id })
        )
      );
      setReturns((prev) => [...newReturns, ...prev]);
      setSuccessMsg(`Se crearon ${newReturns.length} devolucion(es) para la venta ${saleNumber(foundSale)}.`);
      setStep("search");
      setFoundSale(null);
      setItems([]);
      setReason("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al crear devoluciones");
    } finally { setSubmitting(false); }
  };

  const handleStatus = async (id: string, status: ReturnStatus) => {
    try {
      const updated = await updateReturnStatus(id, status, userName);
      setReturns((prev) => prev.map((r) => r.id === id ? updated : r));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al actualizar");
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Devoluciones</h1>
        <p className="text-sm text-gray-500">Busca una venta y selecciona los productos a devolver.</p>
      </div>

      {error && (
        <div className="flex items-center justify-between rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
          <button className="ml-2 font-medium underline" onClick={() => setError("")}>Cerrar</button>
        </div>
      )}
      {successMsg && (
        <div className="flex items-center gap-2 rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          <CheckCircle className="h-4 w-4 flex-shrink-0" />{successMsg}
          <button className="ml-auto text-xs underline" onClick={() => setSuccessMsg("")}>OK</button>
        </div>
      )}

      <div className="rounded-lg bg-white p-5 shadow-sm ring-1 ring-pink-100">
        {step === "search" && (
          <>
            <div className="mb-3">
              <h2 className="font-bold text-gray-800">Crear devolución</h2>
              <p className="text-xs text-gray-400">Busca la venta del cliente o elige una de las recientes para empezar.</p>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                value={saleSearch}
                onChange={(e) => setSaleSearch(e.target.value)}
                autoFocus
                placeholder="Buscar por N° de venta, cliente, DNI, producto o SKU..."
                className="w-full rounded-md border border-gray-200 py-2.5 pl-10 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-pink-400"
              />
            </div>

            {saleSearch.trim() && matchingSales.length === 0 ? (
              <div className="mt-4 rounded-lg border border-dashed border-gray-200 py-8 text-center">
                <Search className="mx-auto mb-2 h-6 w-6 text-gray-300" />
                <p className="text-sm text-gray-500">No se encontraron ventas con &ldquo;{saleSearch}&rdquo;.</p>
                <p className="text-xs text-gray-400">Prueba con el número de venta, el nombre o el DNI del cliente.</p>
              </div>
            ) : matchingSales.length > 0 ? (
              <>
                <p className="mb-2 mt-4 text-xs font-semibold uppercase tracking-wide text-gray-400">
                  {saleSearch.trim() ? `Resultados (${matchingSales.length})` : "Ventas recientes"}
                </p>
                <ul className="space-y-2">
                  {matchingSales.map((sale) => {
                    const itemCount = sale.items.reduce((s, i) => s + i.quantity, 0);
                    const preview = sale.items.map((i) => `${i.quantity}x ${i.product.name}`).join(" · ");
                    return (
                      <li key={sale.id}>
                        <button
                          onClick={() => selectSale(sale)}
                          className="group flex w-full items-center gap-3 rounded-lg border border-gray-100 px-4 py-3 text-left transition-colors hover:border-pink-200 hover:bg-pink-50"
                        >
                          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-pink-100 text-pink-600">
                            <ReceiptText className="h-5 w-5" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <p className="truncate font-semibold text-gray-800">{sale.customerName || "Cliente genérico"}</p>
                              <span className="font-mono text-[11px] text-gray-400">{saleNumber(sale)}</span>
                            </div>
                            <p className="truncate text-xs text-gray-500">{preview}</p>
                            <p className="text-[11px] text-gray-400">
                              {new Date(sale.createdAt).toLocaleDateString("es-PE", { day: "2-digit", month: "short", year: "numeric" })} · {itemCount} unid.
                            </p>
                          </div>
                          <div className="flex flex-shrink-0 flex-col items-end gap-0.5">
                            <span className="font-bold text-pink-700">S/. {sale.total.toFixed(2)}</span>
                            <span className="flex items-center gap-0.5 text-[11px] font-semibold text-pink-600 opacity-0 transition-opacity group-hover:opacity-100">
                              Devolver <ChevronRight className="h-3 w-3" />
                            </span>
                          </div>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </>
            ) : (
              <div className="mt-4 rounded-lg border border-dashed border-gray-200 py-8 text-center text-sm text-gray-400">
                No hay ventas registradas todavía.
              </div>
            )}
          </>
        )}

        {step === "select" && foundSale && (
          <>
            <div className="mb-4 flex items-center gap-3">
              <button onClick={() => { setStep("search"); setFoundSale(null); }} className="rounded-md p-1 text-gray-400 hover:bg-gray-100">
                <ChevronLeft className="h-5 w-5" />
              </button>
              <div>
                <h2 className="font-bold text-gray-800">Selecciona productos a devolver</h2>
                <p className="text-xs text-gray-400">
                  Venta {saleNumber(foundSale)} · {foundSale.customerName || "Anonimo"} ·{" "}
                  {new Date(foundSale.createdAt).toLocaleDateString("es-PE", { day: "2-digit", month: "short", year: "numeric" })}
                </p>
              </div>
              <span className="ml-auto font-bold text-pink-700">S/. {foundSale.total.toFixed(2)}</span>
            </div>

            <div className="mb-4 space-y-2">
              {items.map((item, idx) => (
                <label key={item.productId} className={`flex cursor-pointer items-center gap-3 rounded-lg border px-4 py-3 transition-colors ${item.maxQty === 0 ? "border-gray-100 bg-gray-50 opacity-60" : item.selected ? "border-pink-300 bg-pink-50" : "border-gray-100 hover:border-gray-200 hover:bg-gray-50"}`}>
                  <input
                    type="checkbox"
                    checked={item.selected}
                    disabled={item.maxQty === 0}
                    onChange={() => toggleItem(idx)}
                    className="h-4 w-4 accent-pink-600"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-800 truncate">{item.name}</p>
                    <p className="text-xs text-gray-400">{item.sku ? `SKU: ${item.sku} · ` : ""}Disponible para devolver: {item.maxQty}</p>
                  </div>
                  {item.selected && (
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-xs text-gray-500">Devolver:</span>
                      <input
                        type="number"
                        min={1}
                        max={item.maxQty}
                        value={item.returnQty}
                        onChange={(e) => setQty(idx, Number(e.target.value))}
                        onClick={(e) => e.preventDefault()}
                        className="h-8 w-16 rounded-md border border-pink-200 px-2 text-center text-sm focus:outline-none focus:ring-2 focus:ring-pink-400"
                      />
                    </div>
                  )}
                </label>
              ))}
            </div>

            <div className="mb-4">
              <label className="mb-1 block text-xs font-semibold text-gray-600">Motivo de devolución *</label>
              <input
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Ej: Talla incorrecta, producto defectuoso..."
                className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-400"
              />
            </div>

            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-500">
                {selectedItems.length === 0 ? "Ningún producto seleccionado" : `${selectedItems.length} producto(s) · ${selectedItems.reduce((s, it) => s + it.returnQty, 0)} unid. total`}
              </p>
              <div className="flex gap-2">
                <button onClick={() => { setStep("search"); setFoundSale(null); }} className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50">
                  Cancelar
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={submitting || selectedItems.length === 0 || !reason.trim()}
                  className="inline-flex items-center gap-2 rounded-lg bg-pink-600 px-5 py-2 text-sm font-bold text-white hover:bg-pink-700 disabled:opacity-60"
                >
                  <RotateCcw className="h-4 w-4" />
                  {submitting ? "Procesando..." : "Crear devolución"}
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {loading ? (
        <div className="py-10 text-center text-sm text-gray-400">Cargando devoluciones...</div>
      ) : returns.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-200 py-12 text-center text-sm text-gray-400">
          No hay devoluciones registradas aún
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg bg-white shadow-sm ring-1 ring-gray-100">
          <div className="border-b border-gray-100 px-5 py-4">
            <h2 className="font-bold text-gray-900">Historial de devoluciones</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-pink-50 text-pink-700">
                <tr>
                  <th className="px-5 py-3 text-left font-medium">Producto</th>
                  <th className="px-5 py-3 text-left font-medium">N° Venta</th>
                  <th className="px-5 py-3 text-center font-medium">Cant.</th>
                  <th className="px-5 py-3 text-left font-medium">Motivo</th>
                  <th className="px-5 py-3 text-left font-medium">Estado</th>
                  <th className="px-5 py-3 text-left font-medium">Fecha</th>
                  {isAdmin && <th className="px-5 py-3 text-left font-medium">Acciones</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {returns.map((r) => (
                  <tr key={r.id} className="transition-colors hover:bg-pink-50/40">
                    <td className="px-5 py-3">
                      <p className="font-semibold text-gray-800">{r.product.name}</p>
                      {r.product.sku && <p className="text-xs text-gray-400">SKU: {r.product.sku}</p>}
                    </td>
                    <td className="px-5 py-3 font-mono text-xs text-gray-400">
                      {returnSaleNumber(r)}
                    </td>
                    <td className="px-5 py-3 text-center font-bold text-gray-700">{r.quantity}</td>
                    <td className="px-5 py-3 max-w-[200px] truncate text-gray-600">{r.reason}</td>
                    <td className="px-5 py-3">
                      <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_COLOR[r.status]}`}>
                        {STATUS_LABEL[r.status]}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-xs text-gray-400">
                      {new Date(r.createdAt).toLocaleDateString("es-PE", { day: "2-digit", month: "short", year: "numeric" })}
                    </td>
                    {isAdmin && (
                      <td className="px-5 py-3">
                        {r.status === "PENDING" ? (
                          <div className="flex gap-2">
                            <button onClick={() => handleStatus(r.id, "APPROVED")} className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-100">
                              <CheckCircle className="h-3.5 w-3.5" />Aprobar
                            </button>
                            <button onClick={() => handleStatus(r.id, "REJECTED")} className="inline-flex items-center gap-1 rounded-md bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-600 hover:bg-red-100">
                              <XCircle className="h-3.5 w-3.5" />Rechazar
                            </button>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400">Por: {r.processedBy ?? "—"}</span>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
