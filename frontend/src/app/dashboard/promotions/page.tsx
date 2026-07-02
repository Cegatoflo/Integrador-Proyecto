"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import {
  getPromotions,
  createPromotion,
  updatePromotion,
  togglePromotion,
  deletePromotion,
  getProducts,
  type Promotion,
  type DiscountType,
  type Product,
} from "@/frontend/lib/dashboard/api";

const CATEGORIES = ["Ropa", "Calzado", "Accesorios", "Ropa interior", "Deportivo", "Otro"];

const today = () => new Date().toISOString().split("T")[0];
const nextMonth = () => {
  const d = new Date();
  d.setMonth(d.getMonth() + 1);
  return d.toISOString().split("T")[0];
};

const isExpired = (endDate: string) => new Date(endDate) < new Date();

const blankForm = () => ({
  name: "",
  description: "",
  discountType: "PERCENTAGE" as DiscountType,
  discountValue: "10",
  productId: "",
  category: "",
  startDate: today(),
  endDate: nextMonth(),
});

export default function PromotionsPage() {
  const router = useRouter();
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [warning, setWarning] = useState("");
  const [userName, setUserName] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive" | "expired">("all");

  const [form, setForm] = useState(blankForm);

  const categoryOptions = useMemo(
    () => Array.from(new Set([...CATEGORIES, ...products.map((product) => product.category).filter(Boolean)])),
    [products]
  );

  const filteredPromotions = useMemo(() => {
    const q = search.toLowerCase().trim();
    return promotions.filter((promo) => {
      const status = isExpired(promo.endDate) ? "expired" : promo.isActive ? "active" : "inactive";
      if (statusFilter !== "all" && statusFilter !== status) return false;
      if (!q) return true;
      return (
        promo.name.toLowerCase().includes(q) ||
        (promo.description ?? "").toLowerCase().includes(q) ||
        (promo.product?.name ?? "").toLowerCase().includes(q) ||
        (promo.product?.sku ?? "").toLowerCase().includes(q) ||
        (promo.category ?? "").toLowerCase().includes(q)
      );
    });
  }, [promotions, search, statusFilter]);

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

  const resetForm = () => {
    setForm(blankForm());
    setEditingId(null);
    setShowForm(false);
  };

  const openNew = () => {
    setForm(blankForm());
    setEditingId(null);
    setError("");
    setShowForm(true);
  };

  const startEdit = (promo: Promotion) => {
    setEditingId(promo.id);
    setForm({
      name: promo.name,
      description: promo.description ?? "",
      discountType: promo.discountType,
      discountValue: String(promo.discountValue),
      productId: promo.productId ?? "",
      category: promo.category ?? "",
      startDate: promo.startDate.split("T")[0],
      endDate: promo.endDate.split("T")[0],
    });
    setError("");
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSubmitting(true);
    try {
      if (editingId) {
        const updated = await updatePromotion(editingId, {
          name: form.name.trim(),
          description: form.description.trim(),
          discountType: form.discountType,
          discountValue: Number(form.discountValue),
          productId: form.productId || null,
          category: form.category || null,
          startDate: new Date(form.startDate).toISOString(),
          endDate: new Date(form.endDate).toISOString(),
        });
        setPromotions((prev) => prev.map((p) => (p.id === editingId ? updated : p)));
      } else {
        const promo = await createPromotion({
          name: form.name.trim(),
          description: form.description.trim() || undefined,
          discountType: form.discountType,
          discountValue: Number(form.discountValue),
          productId: form.productId || undefined,
          category: form.category || undefined,
          startDate: new Date(form.startDate).toISOString(),
          endDate: new Date(form.endDate).toISOString(),
          createdBy: userName,
        });
        setPromotions((prev) => [promo, ...prev]);
      }
      resetForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al guardar promoción");
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggle = async (promo: Promotion) => {
    // Una promoción vencida no se puede reactivar ni afecta el precio.
    if (!promo.isActive && isExpired(promo.endDate)) {
      setWarning(
        `La promoción "${promo.name}" venció el ${new Date(promo.endDate).toLocaleDateString("es-CO")} y ya no es válida. No se aplicará al precio. Crea una nueva promoción con fechas vigentes.`
      );
      return;
    }
    try {
      const updated = await togglePromotion(promo.id, !promo.isActive);
      setPromotions((prev) => prev.map((p) => (p.id === promo.id ? updated : p)));
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

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Promociones</h1>
          <p className="mt-1 text-sm text-gray-500">
            Crea descuentos para productos, conjuntos por categoria o toda la tienda
          </p>
        </div>
        <button
          onClick={() => (showForm ? resetForm() : openNew())}
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

      {warning && (
        <div className="mb-4 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <span className="mt-0.5">⚠️</span>
          <span className="flex-1">{warning}</span>
          <button className="font-medium underline" onClick={() => setWarning("")}>
            Cerrar
          </button>
        </div>
      )}

      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="mb-6 rounded-xl border border-pink-100 bg-white p-5 shadow-sm"
        >
          <h2 className="mb-4 text-base font-semibold text-gray-700">{editingId ? "Editar promoción" : "Nueva promoción"}</h2>
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
                Producto (dejar vacio para aplicar por conjunto o toda la tienda)
              </label>
              <select
                value={form.productId}
                onChange={(e) => setForm((f) => ({ ...f, productId: e.target.value, category: e.target.value ? "" : f.category }))}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-pink-400 focus:outline-none"
              >
                <option value="">Sin producto específico</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} {p.sku ? `(${p.sku})` : ""} — Stock: {p.stock} | S/. {p.price.toFixed(2)}
                  </option>
                ))}
              </select>
            </div>
            {!form.productId && (
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">
                  Conjunto / categoria (opcional; si no se elige, aplica a toda la tienda)
                </label>
                <select
                  value={form.category}
                  onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-pink-400 focus:outline-none"
                >
                  <option value="">Toda la tienda</option>
                  {categoryOptions.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            )}
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
              onClick={resetForm}
              className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-lg bg-pink-600 px-4 py-2 text-sm font-medium text-white hover:bg-pink-700 disabled:opacity-50"
            >
              {submitting ? "Guardando..." : editingId ? "Guardar cambios" : "Crear Promoción"}
            </button>
          </div>
        </form>
      )}

      {!loading && promotions.length > 0 && (
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:max-w-xs">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nombre, producto o categoria..."
              className="w-full rounded-lg border border-gray-200 py-2 pl-10 pr-3 text-sm focus:border-pink-400 focus:outline-none"
            />
          </div>
          <div className="flex flex-wrap gap-1.5">
            {([
              ["all", "Todas"],
              ["active", "Vigentes"],
              ["inactive", "Inactivas"],
              ["expired", "Vencidas"],
            ] as const).map(([value, label]) => (
              <button
                key={value}
                onClick={() => setStatusFilter(value)}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                  statusFilter === value
                    ? "bg-pink-600 text-white"
                    : "bg-white text-gray-600 ring-1 ring-gray-200 hover:bg-gray-50"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      )}

      {loading ? (
        <div className="py-12 text-center text-sm text-gray-500">Cargando promociones...</div>
      ) : promotions.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-200 py-16 text-center text-sm text-gray-400">
          No hay promociones registradas
        </div>
      ) : filteredPromotions.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-200 py-16 text-center text-sm text-gray-400">
          No hay promociones que coincidan con la busqueda o el filtro.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredPromotions.map((promo) => {
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
                    <span className="font-medium">Aplica a: </span>
                    {promo.product ? (
                      <span>
                        {promo.product.name}
                        {promo.product.sku ? ` (${promo.product.sku})` : ""}
                        <span className="ml-1 text-gray-400">— Stock: {promo.product.stock}</span>
                      </span>
                    ) : promo.category ? (
                      <span className="rounded bg-blue-50 px-1.5 py-0.5 text-blue-700">
                        Conjunto: {promo.category}
                      </span>
                    ) : (
                      <span className="italic text-gray-400">Toda la tienda</span>
                    )}
                  </div>
                  <div>
                    <span className="font-medium">Vigencia: </span>
                    {new Date(promo.startDate).toLocaleDateString("es-CO")} →{" "}
                    {new Date(promo.endDate).toLocaleDateString("es-CO")}
                  </div>
                  {expired && (
                    <div className="font-medium text-amber-600">⚠ Vencida — no se aplica al precio</div>
                  )}
                  <div className="text-gray-400">Creado por: {promo.createdBy}</div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => startEdit(promo)}
                    className="flex-1 rounded-md bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700 transition hover:bg-blue-100"
                  >
                    Editar
                  </button>
                  {expired ? (
                    <button
                      onClick={() => handleToggle(promo)}
                      className="flex-1 rounded-md bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-700 transition hover:bg-amber-100"
                    >
                      Reactivar
                    </button>
                  ) : (
                    <button
                      onClick={() => handleToggle(promo)}
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
