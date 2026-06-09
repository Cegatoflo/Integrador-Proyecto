"use client";

import { useEffect, useState } from "react";
import {
  getReturns,
  createReturn,
  updateReturnStatus,
  getProducts,
  type ProductReturn,
  type ReturnStatus,
  type Product,
} from "@/frontend/lib/dashboard/api";

const STATUS_LABEL: Record<ReturnStatus, string> = {
  PENDING: "Pendiente",
  APPROVED: "Aprobada",
  REJECTED: "Rechazada",
};

const STATUS_COLOR: Record<ReturnStatus, string> = {
  PENDING: "bg-yellow-100 text-yellow-800",
  APPROVED: "bg-green-100 text-green-800",
  REJECTED: "bg-red-100 text-red-800",
};

export default function ReturnsPage() {
  const [returns, setReturns] = useState<ProductReturn[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [userName, setUserName] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    productId: "",
    quantity: "1",
    reason: "",
    saleId: "",
  });

  useEffect(() => {
    try {
      const user = JSON.parse(localStorage.getItem("top-modas-user") || "{}") as {
        role?: string;
        name?: string;
      };
      setIsAdmin(user.role === "ADMIN");
      setUserName(user.name ?? "Usuario");
    } catch {
      setIsAdmin(false);
    }
  }, []);

  useEffect(() => {
    Promise.all([getReturns(), getProducts()])
      .then(([r, p]) => {
        setReturns(r);
        setProducts(p);
      })
      .catch(() => setError("Error al cargar datos"))
      .finally(() => setLoading(false));
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.productId || !form.reason.trim() || Number(form.quantity) <= 0) return;
    setSubmitting(true);
    try {
      const record = await createReturn({
        productId: form.productId,
        quantity: Number(form.quantity),
        reason: form.reason.trim(),
        saleId: form.saleId.trim() || undefined,
      });
      setReturns((prev) => [record, ...prev]);
      setForm({ productId: "", quantity: "1", reason: "", saleId: "" });
      setShowForm(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al crear devolución");
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatus = async (id: string, status: ReturnStatus) => {
    try {
      const updated = await updateReturnStatus(id, status, userName);
      setReturns((prev) => prev.map((r) => (r.id === id ? updated : r)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al actualizar");
    }
  };

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Devoluciones</h1>
          <p className="mt-1 text-sm text-gray-500">Gestión de devoluciones de productos</p>
        </div>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="rounded-lg bg-pink-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-pink-700"
        >
          {showForm ? "Cancelar" : "+ Nueva Devolución"}
        </button>
      </div>

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
          <button className="ml-2 underline" onClick={() => setError("")}>Cerrar</button>
        </div>
      )}

      {showForm && (
        <form
          onSubmit={handleCreate}
          className="mb-6 rounded-xl border border-pink-100 bg-white p-5 shadow-sm"
        >
          <h2 className="mb-4 text-base font-semibold text-gray-700">Nueva devolución</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">Producto *</label>
              <select
                required
                value={form.productId}
                onChange={(e) => setForm((f) => ({ ...f, productId: e.target.value }))}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-pink-400 focus:outline-none"
              >
                <option value="">Seleccionar producto</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} {p.sku ? `(${p.sku})` : ""} — Stock: {p.stock}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">Cantidad *</label>
              <input
                type="number"
                min="1"
                required
                value={form.quantity}
                onChange={(e) => setForm((f) => ({ ...f, quantity: e.target.value }))}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-pink-400 focus:outline-none"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs font-medium text-gray-600">Motivo *</label>
              <input
                type="text"
                required
                placeholder="Ej: Producto defectuoso, talla incorrecta..."
                value={form.reason}
                onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-pink-400 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">
                N° de Venta (opcional)
              </label>
              <input
                type="text"
                placeholder="ID de la venta relacionada"
                value={form.saleId}
                onChange={(e) => setForm((f) => ({ ...f, saleId: e.target.value }))}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-pink-400 focus:outline-none"
              />
            </div>
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-lg bg-pink-600 px-4 py-2 text-sm font-medium text-white hover:bg-pink-700 disabled:opacity-50"
            >
              {submitting ? "Guardando..." : "Crear Devolución"}
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="py-12 text-center text-sm text-gray-500">Cargando devoluciones...</div>
      ) : returns.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-200 py-16 text-center text-sm text-gray-400">
          No hay devoluciones registradas
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead className="border-b border-gray-100 bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Producto</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Cantidad</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Motivo</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Estado</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Fecha</th>
                {isAdmin && (
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Acciones</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {returns.map((r) => (
                <tr key={r.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-800">{r.product.name}</div>
                    {r.product.sku && (
                      <div className="text-xs text-gray-400">SKU: {r.product.sku}</div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-700">{r.quantity}</td>
                  <td className="px-4 py-3 text-gray-600">{r.reason}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_COLOR[r.status]}`}
                    >
                      {STATUS_LABEL[r.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {new Date(r.createdAt).toLocaleDateString("es-CO")}
                  </td>
                  {isAdmin && (
                    <td className="px-4 py-3">
                      {r.status === "PENDING" && (
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleStatus(r.id, "APPROVED")}
                            className="rounded-md bg-green-50 px-2.5 py-1 text-xs font-medium text-green-700 hover:bg-green-100"
                          >
                            Aprobar
                          </button>
                          <button
                            onClick={() => handleStatus(r.id, "REJECTED")}
                            className="rounded-md bg-red-50 px-2.5 py-1 text-xs font-medium text-red-700 hover:bg-red-100"
                          >
                            Rechazar
                          </button>
                        </div>
                      )}
                      {r.status !== "PENDING" && (
                        <span className="text-xs text-gray-400">
                          Por: {r.processedBy ?? "—"}
                        </span>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
