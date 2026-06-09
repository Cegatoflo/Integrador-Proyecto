"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  getPromotions,
  createPromotion,
  togglePromotion,
  deletePromotion,
  getProducts,
  type Promotion,
  type DiscountType,
  type Product,
} from "@/frontend/lib/dashboard/api";

const today = () => new Date().toISOString().split("T")[0];
const nextMonth = () => {
  const d = new Date();
  d.setMonth(d.getMonth() + 1);
  return d.toISOString().split("T")[0];
};

export default function PromotionsPage() {
  const router = useRouter();
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [userName, setUserName] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: "",
    description: "",
    discountType: "PERCENTAGE" as DiscountType,
    discountValue: "10",
    productId: "",
    startDate: today(),
    endDate: nextMonth(),
  });

  useEffect(() => {
    try {
      const user = JSON.parse(localStorage.getItem("top-modas-user") || "{}") as {
        role?: string;
        name?: string;
      };
      if (user.role !== "ADMIN") {
        router.replace("/dashboard/add-product");
        return;
      }
      setUserName(user.name ?? "Admin");
    } catch {
      router.replace("/dashboard");
    }
  }, [router]);

  useEffect(() => {
    Promise.all([getPromotions(), getProducts()])
      .then(([p, prods]) => {
        setPromotions(p);
        setProducts(prods);
      })
      .catch(() => setError("Error al cargar datos"))
      .finally(() => setLoading(false));
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSubmitting(true);
    try {
      const promo = await createPromotion({
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        discountType: form.discountType,
        discountValue: Number(form.discountValue),
        productId: form.productId || undefined,
        startDate: new Date(form.startDate).toISOString(),
        endDate: new Date(form.endDate).toISOString(),
        createdBy: userName,
      });
      setPromotions((prev) => [promo, ...prev]);
      setForm({
        name: "",
        description: "",
        discountType: "PERCENTAGE",
        discountValue: "10",
        productId: "",
        startDate: today(),
        endDate: nextMonth(),
      });
      setShowForm(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al crear promoción");
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggle = async (id: string, current: boolean) => {
    try {
      const updated = await togglePromotion(id, !current);
      setPromotions((prev) => prev.map((p) => (p.id === id ? updated : p)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al actualizar");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Eliminar esta promoción?")) return;
    setDeletingId(id);
    try {
      await deletePromotion(id);
      setPromotions((prev) => prev.filter((p) => p.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al eliminar");
    } finally {
      setDeletingId(null);
    }
  };

  const isExpired = (endDate: string) => new Date(endDate) < new Date();

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Promociones</h1>
          <p className="mt-1 text-sm text-gray-500">
            Crea y gestiona descuentos sobre productos del inventario
          </p>
        </div>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="rounded-lg bg-pink-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-pink-700"
        >
          {showForm ? "Cancelar" : "+ Nueva Promoción"}
        </button>
      </div>

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
          <button className="ml-2 underline" onClick={() => setError("")}>
            Cerrar
          </button>
        </div>
      )}

      {showForm && (
        <form
          onSubmit={handleCreate}
          className="mb-6 rounded-xl border border-pink-100 bg-white p-5 shadow-sm"
        >
          <h2 className="mb-4 text-base font-semibold text-gray-700">Nueva promoción</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">
                Nombre de la promoción *
              </label>
              <input
                type="text"
                required
                placeholder="Ej: Descuento verano 20%"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-pink-400 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">
                Producto (dejar vacío para promoción general)
              </label>
              <select
                value={form.productId}
                onChange={(e) => setForm((f) => ({ ...f, productId: e.target.value }))}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-pink-400 focus:outline-none"
              >
                <option value="">Todos los productos</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} {p.sku ? `(${p.sku})` : ""} — Stock: {p.stock} | ${p.price.toLocaleString("es-CO")}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">
                Tipo de descuento *
              </label>
              <select
                value={form.discountType}
                onChange={(e) =>
                  setForm((f) => ({ ...f, discountType: e.target.value as DiscountType }))
                }
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-pink-400 focus:outline-none"
              >
                <option value="PERCENTAGE">Porcentaje (%)</option>
                <option value="FIXED">Valor fijo ($)</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">
                Valor del descuento *{" "}
                {form.discountType === "PERCENTAGE" ? "(1–100)" : "(en pesos)"}
              </label>
              <input
                type="number"
                required
                min="1"
                max={form.discountType === "PERCENTAGE" ? "100" : undefined}
                value={form.discountValue}
                onChange={(e) => setForm((f) => ({ ...f, discountValue: e.target.value }))}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-pink-400 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">
                Fecha de inicio *
              </label>
              <input
                type="date"
                required
                value={form.startDate}
                onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-pink-400 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">
                Fecha de fin *
              </label>
              <input
                type="date"
                required
                value={form.endDate}
                onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-pink-400 focus:outline-none"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs font-medium text-gray-600">
                Descripción (opcional)
              </label>
              <input
                type="text"
                placeholder="Descripción o condiciones de la promoción"
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
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
              {submitting ? "Guardando..." : "Crear Promoción"}
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="py-12 text-center text-sm text-gray-500">Cargando promociones...</div>
      ) : promotions.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-200 py-16 text-center text-sm text-gray-400">
          No hay promociones registradas
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {promotions.map((promo) => {
            const expired = isExpired(promo.endDate);
            return (
              <div
                key={promo.id}
                className={`rounded-xl border bg-white p-4 shadow-sm transition ${
                  promo.isActive && !expired
                    ? "border-pink-100"
                    : "border-gray-100 opacity-70"
                }`}
              >
                <div className="mb-2 flex items-start justify-between gap-2">
                  <h3 className="font-semibold text-gray-800">{promo.name}</h3>
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
                      expired
                        ? "bg-gray-100 text-gray-500"
                        : promo.isActive
                        ? "bg-green-100 text-green-700"
                        : "bg-gray-100 text-gray-500"
                    }`}
                  >
                    {expired ? "Vencida" : promo.isActive ? "Activa" : "Inactiva"}
                  </span>
                </div>

                {promo.description && (
                  <p className="mb-2 text-xs text-gray-500">{promo.description}</p>
                )}

                <div className="mb-3 space-y-1 text-xs text-gray-600">
                  <div className="flex items-center gap-1">
                    <span className="font-medium">Descuento:</span>
                    <span className="rounded bg-pink-50 px-1.5 py-0.5 font-semibold text-pink-700">
                      {promo.discountType === "PERCENTAGE"
                        ? `${promo.discountValue}%`
                        : `$${promo.discountValue.toLocaleString("es-CO")}`}
                    </span>
                  </div>
                  <div>
                    <span className="font-medium">Producto: </span>
                    {promo.product ? (
                      <span>
                        {promo.product.name}
                        {promo.product.sku ? ` (${promo.product.sku})` : ""}
                        <span className="ml-1 text-gray-400">
                          — Stock: {promo.product.stock}
                        </span>
                      </span>
                    ) : (
                      <span className="italic text-gray-400">General (todos)</span>
                    )}
                  </div>
                  <div>
                    <span className="font-medium">Vigencia: </span>
                    {new Date(promo.startDate).toLocaleDateString("es-CO")} →{" "}
                    {new Date(promo.endDate).toLocaleDateString("es-CO")}
                  </div>
                  <div className="text-gray-400">Creado por: {promo.createdBy}</div>
                </div>

                <div className="flex gap-2">
                  {!expired && (
                    <button
                      onClick={() => handleToggle(promo.id, promo.isActive)}
                      className={`flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition ${
                        promo.isActive
                          ? "bg-gray-100 text-gray-600 hover:bg-gray-200"
                          : "bg-green-50 text-green-700 hover:bg-green-100"
                      }`}
                    >
                      {promo.isActive ? "Desactivar" : "Activar"}
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(promo.id)}
                    disabled={deletingId === promo.id}
                    className="flex-1 rounded-md bg-red-50 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-100 disabled:opacity-50"
                  >
                    {deletingId === promo.id ? "Eliminando..." : "Eliminar"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
