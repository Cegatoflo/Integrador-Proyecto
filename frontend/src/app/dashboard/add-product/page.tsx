"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, Bell, CheckCircle, DollarSign, Package, Plus, Save, Search, Send, Settings, Trash2 } from "lucide-react";
import { createStockRequest, getProducts, type Product } from "@/frontend/lib/dashboard/api";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:3001";
const INVENTORY_SETTINGS_KEY = "top-modas-inventory-settings";
const CATEGORIES = ["Ropa", "Calzado", "Accesorios", "Ropa interior", "Deportivo", "Otro"];
const SIZES = ["XXS", "XS", "S", "M", "L", "XL", "XXL", "Unitalla"];

const emptyForm = {
  name: "",
  category: "",
  price: "",
  stock: "",
  sku: "",
  size: "",
  color: "#e85b9c",
  brand: "",
  referencePrice: "",
  description: "",
};

const generateSku = (products: Product[]) => {
  const next = products.length + 1;
  return `TMP-${String(next).padStart(4, "0")}`;
};

const getInventorySettings = () => {
  if (typeof window === "undefined") return { lowStockLimit: 10, criticalStockLimit: 3 };
  try {
    return {
      lowStockLimit: 10,
      criticalStockLimit: 3,
      ...JSON.parse(localStorage.getItem(INVENTORY_SETTINGS_KEY) || "{}"),
    };
  } catch {
    return { lowStockLimit: 10, criticalStockLimit: 3 };
  }
};

const getCurrentUser = (): { role: string; name: string; email: string } => {
  try {
    return JSON.parse(localStorage.getItem("top-modas-user") || "{}");
  } catch {
    return { role: "USER", name: "", email: "" };
  }
};

export default function AddProductPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("todos");
  const [statusFilter, setStatusFilter] = useState("todos");
  const [settings, setSettings] = useState({ lowStockLimit: 10, criticalStockLimit: 3 });
  const [formData, setFormData] = useState(emptyForm);
  const [stockEntries, setStockEntries] = useState<Record<string, string>>({});
  const [updatingStockId, setUpdatingStockId] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [currentUser, setCurrentUser] = useState<{ role: string; name: string; email: string }>({ role: "USER", name: "", email: "" });
  const [requestedIds, setRequestedIds] = useState<Record<string, boolean>>({});

  const fetchProducts = async () => {
    setLoading(true);
    try {
      setProducts(await getProducts());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setSettings(getInventorySettings());
    fetchProducts();
    const user = getCurrentUser();
    setCurrentUser(user);
    setIsAdmin(user.role === "ADMIN");
  }, []);

  const getStatus = useCallback((stock: number) => {
    if (stock === 0) return { id: "agotado", label: "Agotado", className: "text-red-600", alertClass: "bg-red-100 text-red-600" };
    if (stock <= settings.criticalStockLimit) return { id: "critico", label: "Critico", className: "text-rose-600", alertClass: "bg-rose-100 text-rose-700" };
    if (stock <= settings.lowStockLimit) return { id: "bajo", label: "Bajo", className: "text-amber-600", alertClass: "bg-amber-100 text-amber-700" };
    return { id: "ok", label: "OK", className: "text-gray-700", alertClass: "bg-emerald-100 text-emerald-700" };
  }, [settings.criticalStockLimit, settings.lowStockLimit]);

  const filteredProducts = useMemo(() => {
    const q = searchTerm.toLowerCase().trim();
    return products.filter((product) => {
      const status = getStatus(product.stock).id;
      const matchesSearch =
        product.name.toLowerCase().includes(q) ||
        product.category.toLowerCase().includes(q) ||
        (product.sku || "").toLowerCase().includes(q) ||
        (product.color || "").toLowerCase().includes(q) ||
        (product.brand || "").toLowerCase().includes(q);
      return (
        matchesSearch &&
        (categoryFilter === "todos" || product.category === categoryFilter) &&
        (statusFilter === "todos" || status === statusFilter)
      );
    });
  }, [products, searchTerm, categoryFilter, statusFilter, getStatus]);

  const totalValue = products.reduce((sum, product) => sum + product.price * product.stock, 0);
  const outOfStock = products.filter((product) => product.stock === 0).length;
  const lowStock = products.filter((product) => {
    const status = getStatus(product.stock).id;
    return status === "bajo" || status === "critico";
  }).length;

  const handleAdd = async (event: React.FormEvent) => {
    event.preventDefault();
    setFormError("");

    if (!formData.name.trim() || !formData.category || !formData.price || formData.stock === "" || !formData.size) {
      setFormError("Completa producto, categoria, talla, precio y stock.");
      return;
    }
    if (!/^#[0-9A-Fa-f]{6}$/.test(formData.color)) {
      setFormError("El color debe estar en formato HEX, por ejemplo #E85B9C.");
      return;
    }
    if (Number(formData.price) <= 0 || Number(formData.stock) < 0) {
      setFormError("Revisa precio y stock.");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/products`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name.trim(),
          category: formData.category,
          price: Number(formData.price),
          stock: Number(formData.stock),
          sku: formData.sku.trim() || generateSku(products),
          size: formData.size,
          color: formData.color.toUpperCase(),
          brand: formData.brand.trim(),
          referencePrice: formData.referencePrice,
          description: formData.description.trim(),
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        setFormError(data.error ?? "Error al guardar");
        return;
      }
      setFormData(emptyForm);
      await fetchProducts();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Eliminar este producto?")) return;
    await fetch(`${BACKEND_URL}/api/products/${id}`, { method: "DELETE" });
    setProducts((prev) => prev.filter((product) => product.id !== id));
  };

  const handleStockEntry = async (product: Product) => {
    const quantity = Number(stockEntries[product.id] || 0);
    if (!Number.isFinite(quantity) || quantity <= 0) {
      setFormError("Ingresa una cantidad valida para aumentar stock.");
      return;
    }

    setUpdatingStockId(product.id);
    setFormError("");
    try {
      const res = await fetch(`${BACKEND_URL}/api/stock-entries`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: product.id,
          quantity,
          note: "Entrada registrada desde Añadir Producto",
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        setFormError(data.error ?? "No se pudo actualizar el stock");
        return;
      }
      setStockEntries((prev) => ({ ...prev, [product.id]: "" }));
      await fetchProducts();
    } finally {
      setUpdatingStockId("");
    }
  };

  const handleStockRequest = async (product: Product) => {
    const quantity = Number(stockEntries[product.id] || 0);
    if (!Number.isFinite(quantity) || quantity <= 0) {
      setFormError("Ingresa la cantidad que necesitas solicitar.");
      return;
    }

    setUpdatingStockId(product.id);
    setFormError("");
    try {
      await createStockRequest({
        productId: product.id,
        requestedBy: currentUser.name || currentUser.email || "Vendedor",
        quantityRequested: quantity,
        note: `Solicitud desde inventario — stock actual: ${product.stock}`,
      });
      setStockEntries((prev) => ({ ...prev, [product.id]: "" }));
      setRequestedIds((prev) => ({ ...prev, [product.id]: true }));
      setTimeout(() => setRequestedIds((prev) => ({ ...prev, [product.id]: false })), 3000);
    } catch {
      setFormError("No se pudo enviar la solicitud.");
    } finally {
      setUpdatingStockId("");
    }
  };

  const colSpan = isAdmin ? 9 : 7;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{isAdmin ? "Añadir Producto" : "Inventario"}</h1>
          <p className="text-sm text-gray-500">
            {isAdmin
              ? "Registro, consulta y control de stock en una sola hoja."
              : "Consulta el inventario y solicita reposición de stock al administrador."}
          </p>
        </div>
        {isAdmin && (
          <a
            href="/dashboard/settings"
            className="inline-flex items-center gap-2 rounded-md bg-white px-4 py-2 text-sm font-bold text-gray-700 shadow-sm ring-1 ring-gray-200 hover:bg-gray-50"
          >
            <Settings className="h-4 w-4" />
            Configurar stock
          </a>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <StatCard icon={<Package className="h-5 w-5 text-pink-600" />} label="Productos" value={products.length.toString()} />
        <StatCard icon={<AlertTriangle className="h-5 w-5 text-amber-600" />} label="Stock bajo" value={lowStock.toString()} />
        <StatCard icon={<AlertTriangle className="h-5 w-5 text-red-500" />} label="Agotados" value={outOfStock.toString()} />
        {isAdmin && (
          <StatCard icon={<DollarSign className="h-5 w-5 text-emerald-600" />} label="Valor almacen" value={`S/. ${totalValue.toLocaleString("es-PE", { minimumFractionDigits: 2 })}`} />
        )}
      </div>

      {isAdmin && (
        <form onSubmit={handleAdd} className="rounded-lg bg-white p-5 shadow-sm ring-1 ring-pink-100">
          <div className="mb-4 flex items-center justify-between gap-3 border-b border-gray-100 pb-3">
            <div>
              <h2 className="font-bold text-gray-900">Registro de producto</h2>
              <p className="text-xs text-gray-500">Talla por combo, color por HEX y ultimo precio de referencia.</p>
            </div>
            <span className="rounded-full bg-pink-50 px-3 py-1 text-xs font-bold text-pink-700">Alta rapida</span>
          </div>

          <div className="grid gap-4 md:grid-cols-6">
            <Field label="Producto" className="md:col-span-2">
              <input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="Ej. Falda corta" className="field" />
            </Field>
            <Field label="SKU / Codigo">
              <input value={formData.sku} onChange={(e) => setFormData({ ...formData, sku: e.target.value })} placeholder={generateSku(products)} className="field" />
            </Field>
            <Field label="Categoria">
              <select value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })} className="field bg-white">
                <option value="">Seleccionar</option>
                {CATEGORIES.map((category) => <option key={category} value={category}>{category}</option>)}
              </select>
            </Field>
            <Field label="Talla">
              <select value={formData.size} onChange={(e) => setFormData({ ...formData, size: e.target.value })} className="field bg-white">
                <option value="">Talla</option>
                {SIZES.map((size) => <option key={size} value={size}>{size}</option>)}
              </select>
            </Field>
            <Field label="Color HEX">
              <div className="flex gap-2">
                <input type="color" value={formData.color} onChange={(e) => setFormData({ ...formData, color: e.target.value })} className="h-10 w-12 rounded-md border border-gray-200 bg-white p-1" />
                <input value={formData.color} onChange={(e) => setFormData({ ...formData, color: e.target.value })} className="field flex-1 uppercase" />
              </div>
            </Field>
            <Field label="Marca / proveedor" className="md:col-span-2">
              <input value={formData.brand} onChange={(e) => setFormData({ ...formData, brand: e.target.value })} placeholder="Top Modas" className="field" />
            </Field>
            <Field label="Precio ref.">
              <input type="number" min="0" step="0.01" value={formData.referencePrice} onChange={(e) => setFormData({ ...formData, referencePrice: e.target.value })} placeholder="0.00" className="field" />
            </Field>
            <Field label="Precio venta">
              <input type="number" min="0" step="0.01" value={formData.price} onChange={(e) => setFormData({ ...formData, price: e.target.value })} placeholder="0.00" className="field" />
            </Field>
            <Field label="Stock">
              <input type="number" min="0" value={formData.stock} onChange={(e) => setFormData({ ...formData, stock: e.target.value })} placeholder="0" className="field" />
            </Field>
            <Field label="Notas / caracteristicas" className="md:col-span-6">
              <input value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} placeholder="Material, temporada, observaciones..." className="field" />
            </Field>
          </div>

          {formError && <p className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm font-semibold text-red-600">{formError}</p>}

          <button type="submit" disabled={saving} className="mt-4 inline-flex items-center gap-2 rounded-md bg-pink-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-pink-700 disabled:opacity-60">
            <Save className="h-4 w-4" />
            {saving ? "Guardando..." : "Guardar producto"}
          </button>
        </form>
      )}

      {!isAdmin && formError && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm font-semibold text-red-600">{formError}</p>
      )}

      <div className="rounded-lg bg-white shadow-sm ring-1 ring-gray-100">
        <div className="grid gap-3 border-b border-gray-100 p-4 md:grid-cols-[1fr_180px_160px]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Buscar producto, SKU, color, marca o categoria..." className="field pl-10" />
          </div>
          <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="field bg-white">
            <option value="todos">Todas las categorias</option>
            {CATEGORIES.map((category) => <option key={category} value={category}>{category}</option>)}
          </select>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="field bg-white">
            <option value="todos">Todos los estados</option>
            <option value="ok">OK</option>
            <option value="bajo">Bajo</option>
            <option value="critico">Critico</option>
            <option value="agotado">Agotado</option>
          </select>
        </div>

        {loading ? (
          <div className="px-5 py-10 text-center text-sm text-gray-400">Cargando productos...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-pink-50 text-pink-700">
                <tr>
                  <th className="px-5 py-3 text-left font-medium">ID/SKU</th>
                  <th className="px-5 py-3 text-left font-medium">Producto</th>
                  <th className="px-5 py-3 text-left font-medium">Talla/Color</th>
                  <th className="px-5 py-3 text-left font-medium">Categoria</th>
                  <th className="px-5 py-3 text-right font-medium">Stock</th>
                  <th className="px-5 py-3 text-right font-medium">{isAdmin ? "Nuevo stock" : "Solicitar"}</th>
                  {isAdmin && <th className="px-5 py-3 text-right font-medium">Precio ref.</th>}
                  <th className="px-5 py-3 text-right font-medium">Precio</th>
                  {isAdmin && <th className="px-5 py-3 text-center font-medium">Accion</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredProducts.length === 0 ? (
                  <tr><td colSpan={colSpan} className="px-5 py-10 text-center text-gray-400">No hay productos con esos filtros</td></tr>
                ) : (
                  filteredProducts.map((product, index) => {
                    const status = getStatus(product.stock);
                    const justRequested = requestedIds[product.id];
                    return (
                      <tr key={product.id} className="transition-colors hover:bg-pink-50/40">
                        <td className="px-5 py-3">
                          <p className="font-mono text-xs text-gray-500">{product.sku || String(index + 1).padStart(3, "0")}</p>
                          <p className="font-mono text-[10px] text-gray-300">{product.id.slice(0, 6)}</p>
                        </td>
                        <td className="px-5 py-3">
                          <p className="font-semibold text-gray-800">{product.name}</p>
                          <p className="max-w-[220px] truncate text-xs text-gray-400">{product.description || product.brand || "Sin notas"}</p>
                        </td>
                        <td className="px-5 py-3 text-gray-500">
                          <p>{product.size || "-"}</p>
                          <div className="flex items-center gap-2 text-xs text-gray-400">
                            <span className="h-3 w-3 rounded-full border" style={{ backgroundColor: product.color || "#fff" }} />
                            {product.color || "-"}
                          </div>
                        </td>
                        <td className="px-5 py-3 text-gray-500">{product.category}</td>
                        <td className="px-5 py-3 text-right">
                          <div className="inline-flex items-center justify-end gap-2">
                            <span className={`font-bold ${status.className}`}>{String(product.stock).padStart(2, "0")}</span>
                            {status.id !== "ok" && (
                              <span className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-bold ${status.alertClass}`}>
                                <Bell className="h-3 w-3" />
                                {status.label}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-5 py-3">
                          {isAdmin ? (
                            <div className="flex items-center justify-end gap-2">
                              <input
                                type="number"
                                min="1"
                                value={stockEntries[product.id] || ""}
                                onChange={(e) => setStockEntries((prev) => ({ ...prev, [product.id]: e.target.value }))}
                                placeholder="+"
                                className="h-8 w-16 rounded-md border border-gray-200 px-2 text-right text-xs focus:outline-none focus:ring-2 focus:ring-pink-400"
                              />
                              <button
                                type="button"
                                onClick={() => handleStockEntry(product)}
                                disabled={updatingStockId === product.id}
                                className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-pink-600 text-white hover:bg-pink-700 disabled:opacity-60"
                                title="Registrar entrada de stock"
                              >
                                <Plus className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center justify-end gap-2">
                              {justRequested ? (
                                <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700">
                                  <CheckCircle className="h-3.5 w-3.5" />
                                  Enviada
                                </span>
                              ) : (
                                <>
                                  <input
                                    type="number"
                                    min="1"
                                    value={stockEntries[product.id] || ""}
                                    onChange={(e) => setStockEntries((prev) => ({ ...prev, [product.id]: e.target.value }))}
                                    placeholder="Cant."
                                    className="h-8 w-16 rounded-md border border-gray-200 px-2 text-right text-xs focus:outline-none focus:ring-2 focus:ring-pink-400"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => handleStockRequest(product)}
                                    disabled={updatingStockId === product.id}
                                    className="inline-flex h-8 items-center gap-1.5 rounded-md bg-blue-600 px-3 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
                                    title="Solicitar reposición de stock"
                                  >
                                    <Send className="h-3 w-3" />
                                    Solicitar
                                  </button>
                                </>
                              )}
                            </div>
                          )}
                        </td>
                        {isAdmin && (
                          <td className="px-5 py-3 text-right text-gray-500">{product.referencePrice ? `S/. ${product.referencePrice.toFixed(2)}` : "-"}</td>
                        )}
                        <td className="px-5 py-3 text-right text-gray-700">S/. {product.price.toFixed(2)}</td>
                        {isAdmin && (
                          <td className="px-5 py-3 text-center">
                            <button onClick={() => handleDelete(product.id)} className="rounded-md p-2 text-gray-400 hover:bg-red-50 hover:text-red-500" title="Eliminar producto">
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </td>
                        )}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <style jsx>{`
        .field {
          width: 100%;
          border-radius: 0.375rem;
          border: 1px solid rgb(229 231 235);
          padding: 0.625rem 0.75rem;
          font-size: 0.875rem;
          outline: none;
        }
        .field:focus {
          box-shadow: 0 0 0 2px rgb(244 114 182);
        }
      `}</style>
    </div>
  );
}

function Field({ label, className = "", children }: { label: string; className?: string; children: React.ReactNode }) {
  return (
    <label className={`space-y-1 ${className}`}>
      <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</span>
      {children}
    </label>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-4 rounded-lg border border-pink-100 bg-white p-4 shadow-sm">
      <div className="rounded-md bg-pink-50 p-3">{icon}</div>
      <div>
        <p className="text-xs uppercase tracking-wide text-gray-500">{label}</p>
        <p className="text-xl font-bold text-gray-900">{value}</p>
      </div>
    </div>
  );
}

