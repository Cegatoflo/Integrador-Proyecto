"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, Bell, Check, CheckCircle, Clock, DollarSign, Package, Pencil, Plus, Save, Search, Send, Settings, Trash2, X } from "lucide-react";
import { createStockRequest, getProducts, getStockRequests, updateStockRequestStatus, type Product, type StockRequest, type StockRequestStatus } from "@/frontend/lib/dashboard/api";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:3001";
const INVENTORY_SETTINGS_KEY = "top-modas-inventory-settings";
const CATEGORIES = ["Ropa", "Calzado", "Accesorios", "Ropa interior", "Deportivo", "Otro"];
const SIZES = ["XXS", "XS", "S", "M", "L", "XL", "XXL", "Unitalla", "26", "28", "30", "32", "34", "36", "38", "40", "42"];
const BRANDS = ["Top Modas", "Nike", "Adidas", "Zara", "H&M", "Shein", "Leonisa", "Crystal", "Otro"];

const emptyForm = {
  name: "", category: "", price: "", stock: "", sku: "", size: "",
  color: "#e85b9c", brand: "", brandCustom: "", referencePrice: "", description: "",
};

const hasMultipleValues = (value?: string | null) => /[,;/|]/.test(value || "");
const normalizeSku = (value: string) => value.trim().toUpperCase();

const generateSku = (products: Product[]) => {
  const used = new Set(products.map((product) => product.sku?.toUpperCase()).filter(Boolean));
  let next = products.length + 1;
  let sku = `TMP-${String(next).padStart(4, "0")}`;
  while (used.has(sku)) {
    next += 1;
    sku = `TMP-${String(next).padStart(4, "0")}`;
  }
  return sku;
};

const getInventorySettings = () => {
  if (typeof window === "undefined") return { lowStockLimit: 10, criticalStockLimit: 3 };
  try {
    return { lowStockLimit: 10, criticalStockLimit: 3, ...JSON.parse(localStorage.getItem(INVENTORY_SETTINGS_KEY) || "{}") };
  } catch { return { lowStockLimit: 10, criticalStockLimit: 3 }; }
};

const getCurrentUser = (): { role: string; name: string; email: string } => {
  try { return JSON.parse(localStorage.getItem("top-modas-user") || "{}"); }
  catch { return { role: "USER", name: "", email: "" }; }
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
  const [pendingRequests, setPendingRequests] = useState<StockRequest[]>([]);
  const [busyRequestId, setBusyRequestId] = useState("");
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [editForm, setEditForm] = useState<Partial<typeof emptyForm>>({});
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState("");

  const fetchProducts = async () => {
    setLoading(true);
    try { setProducts(await getProducts()); }
    finally { setLoading(false); }
  };

  const fetchPendingRequests = async () => {
    try {
      const requests = await getStockRequests();
      const pending = requests.filter((r) => r.status === "PENDING");
      setPendingRequests(pending);
      // Si venimos desde la notificación ("Gestionar en inventario"), bajamos a la sección.
      if (pending.length > 0 && typeof window !== "undefined" && window.location.hash === "#solicitudes") {
        setTimeout(() => document.getElementById("solicitudes")?.scrollIntoView({ behavior: "smooth", block: "start" }), 150);
      }
    } catch {
      // silencioso: la sección simplemente no se muestra
    }
  };

  useEffect(() => {
    setSettings(getInventorySettings());
    fetchProducts();
    const user = getCurrentUser();
    setCurrentUser(user);
    setIsAdmin(user.role === "ADMIN");
    if (user.role === "ADMIN") fetchPendingRequests();
  }, []);

  const handleRequestDecision = async (id: string, status: StockRequestStatus) => {
    setBusyRequestId(id);
    try {
      await updateStockRequestStatus(id, status);
      setPendingRequests((prev) => prev.filter((r) => r.id !== id));
      // Al aprobar, el backend suma la cantidad al stock: refrescamos la tabla.
      if (status === "APPROVED") await fetchProducts();
    } catch {
      setFormError("No se pudo actualizar la solicitud.");
    } finally {
      setBusyRequestId("");
    }
  };

  const getStatus = useCallback((stock: number) => {
    if (stock === 0) return { id: "agotado", label: "Agotado", className: "text-red-600", alertClass: "bg-red-100 text-red-600" };
    if (stock <= settings.criticalStockLimit) return { id: "critico", label: "Critico", className: "text-rose-600", alertClass: "bg-rose-100 text-rose-700" };
    if (stock <= settings.lowStockLimit) return { id: "bajo", label: "Bajo", className: "text-amber-600", alertClass: "bg-amber-100 text-amber-700" };
    return { id: "ok", label: "OK", className: "text-gray-700", alertClass: "bg-emerald-100 text-emerald-700" };
  }, [settings.criticalStockLimit, settings.lowStockLimit]);

  const filteredProducts = useMemo(() => {
    const q = searchTerm.toLowerCase().trim();
    return products.filter((p) => {
      const status = getStatus(p.stock).id;
      const matchesSearch =
        p.name.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q) ||
        (p.sku || "").toLowerCase().includes(q) ||
        (p.color || "").toLowerCase().includes(q) ||
        (p.brand || "").toLowerCase().includes(q);
      return matchesSearch &&
        (categoryFilter === "todos" || p.category === categoryFilter) &&
        (statusFilter === "todos" || status === statusFilter);
    });
  }, [products, searchTerm, categoryFilter, statusFilter, getStatus]);

  const totalValue = products.reduce((sum, p) => sum + p.price * p.stock, 0);
  const outOfStock = products.filter((p) => p.stock === 0).length;
  const lowStock = products.filter((p) => { const s = getStatus(p.stock).id; return s === "bajo" || s === "critico"; }).length;

  const resolvedBrand = (data: typeof emptyForm) => data.brand === "Otro" ? data.brandCustom.trim() : data.brand.trim();
  const isSkuTaken = (sku: string, currentProductId?: string) =>
    products.some((product) => product.id !== currentProductId && (product.sku || "").toUpperCase() === sku.toUpperCase());

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    if (!formData.name.trim() || !formData.category || !formData.price || formData.stock === "" || !formData.size) {
      setFormError("Completa producto, categoría, talla, precio y stock."); return;
    }
    const sku = normalizeSku(formData.sku || generateSku(products));
    if (!sku) { setFormError("El SKU es requerido para cada talla/color."); return; }
    if (isSkuTaken(sku)) { setFormError("Ese SKU ya existe. Cada talla/color debe tener un SKU unico."); return; }
    if (hasMultipleValues(formData.size)) { setFormError("Cada SKU debe tener una sola talla. Crea otro producto para otra talla."); return; }
    if (!/^#[0-9A-Fa-f]{6}$/.test(formData.color)) { setFormError("Color en formato HEX, ej: #E85B9C."); return; }
    if (hasMultipleValues(formData.color)) { setFormError("Cada SKU debe tener un solo color."); return; }
    if (Number(formData.price) <= 0 || Number(formData.stock) < 0) { setFormError("Revisa precio y stock."); return; }
    setSaving(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/products`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name.trim(), category: formData.category,
          price: Number(formData.price), stock: Number(formData.stock),
          sku,
          size: formData.size.trim(), color: formData.color.toUpperCase(),
          brand: resolvedBrand(formData), referencePrice: formData.referencePrice,
          description: formData.description.trim(),
        }),
      });
      if (!res.ok) { const d = await res.json(); setFormError(d.error ?? "Error al guardar"); return; }
      setFormData(emptyForm);
      await fetchProducts();
    } finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Eliminar este producto?")) return;
    await fetch(`${BACKEND_URL}/api/products/${id}`, { method: "DELETE" });
    setProducts((prev) => prev.filter((p) => p.id !== id));
  };

  const openEdit = (p: Product) => {
    setEditProduct(p);
    const brandInList = BRANDS.includes(p.brand || "") || !p.brand;
    setEditForm({
      name: p.name, category: p.category, price: String(p.price), stock: String(p.stock),
      sku: p.sku || "", size: p.size || "", color: p.color || "#e85b9c",
      brand: brandInList ? (p.brand || "") : "Otro",
      brandCustom: brandInList ? "" : (p.brand || ""),
      referencePrice: p.referencePrice ? String(p.referencePrice) : "",
      description: p.description || "",
    });
    setEditError("");
  };

  const handleEditSave = async () => {
    if (!editProduct) return;
    const sku = normalizeSku(editForm.sku || "");
    if (!sku) { setEditError("El SKU es requerido para cada talla/color."); return; }
    if (isSkuTaken(sku, editProduct.id)) { setEditError("Ese SKU ya existe. Cada talla/color debe tener un SKU unico."); return; }
    if (!editForm.size?.trim()) { setEditError("La talla es requerida."); return; }
    if (hasMultipleValues(editForm.size)) { setEditError("Cada SKU debe tener una sola talla. Crea otro producto para otra talla."); return; }
    if (!/^#[0-9A-Fa-f]{6}$/.test(editForm.color || "")) { setEditError("Color en formato HEX, ej: #E85B9C."); return; }
    if (hasMultipleValues(editForm.color)) { setEditError("Cada SKU debe tener un solo color."); return; }
    setEditSaving(true);
    setEditError("");
    try {
      const brand = editForm.brand === "Otro" ? (editForm.brandCustom || "").trim() : (editForm.brand || "").trim();
      const res = await fetch(`${BACKEND_URL}/api/products/${editProduct.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editForm.name?.trim(), category: editForm.category,
          sku,
          price: Number(editForm.price), size: editForm.size.trim(),
          color: editForm.color?.toUpperCase(), brand,
          referencePrice: editForm.referencePrice || null,
          description: editForm.description?.trim() || null,
        }),
      });
      if (!res.ok) { const d = await res.json(); setEditError(d.error ?? "Error al guardar"); return; }
      setEditProduct(null);
      await fetchProducts();
    } finally { setEditSaving(false); }
  };

  const handleStockEntry = async (product: Product) => {
    const quantity = Number(stockEntries[product.id] || 0);
    if (!Number.isFinite(quantity) || quantity <= 0) { setFormError("Ingresa una cantidad válida."); return; }
    setUpdatingStockId(product.id); setFormError("");
    try {
      const res = await fetch(`${BACKEND_URL}/api/stock-entries`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId: product.id, quantity, note: "Entrada desde inventario" }),
      });
      if (!res.ok) { const d = await res.json(); setFormError(d.error ?? "No se pudo actualizar"); return; }
      setStockEntries((prev) => ({ ...prev, [product.id]: "" }));
      await fetchProducts();
    } finally { setUpdatingStockId(""); }
  };

  const handleStockRequest = async (product: Product) => {
    const quantity = Number(stockEntries[product.id] || 0);
    if (!Number.isFinite(quantity) || quantity <= 0) { setFormError("Ingresa la cantidad a solicitar."); return; }
    setUpdatingStockId(product.id); setFormError("");
    try {
      await createStockRequest({ productId: product.id, requestedBy: currentUser.name || currentUser.email || "Vendedor", quantityRequested: quantity, note: `Stock actual: ${product.stock}` });
      setStockEntries((prev) => ({ ...prev, [product.id]: "" }));
      setRequestedIds((prev) => ({ ...prev, [product.id]: true }));
      setTimeout(() => setRequestedIds((prev) => ({ ...prev, [product.id]: false })), 3000);
    } catch { setFormError("No se pudo enviar la solicitud."); }
    finally { setUpdatingStockId(""); }
  };

  const colSpan = isAdmin ? 9 : 7;

  return (
    <div className="space-y-5">
      <datalist id="size-options">
        {SIZES.map((size) => <option key={size} value={size} />)}
      </datalist>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{isAdmin ? "Inventario" : "Inventario"}</h1>
          <p className="text-sm text-gray-700">{isAdmin ? "Registro, consulta y control de stock." : "Consulta el inventario y solicita reposición al administrador."}</p>
        </div>
        {isAdmin && (
          <a href="/dashboard/settings" aria-label="Ir a configuración de stock" className="inline-flex items-center gap-2 rounded-md bg-white px-4 py-2 text-sm font-bold text-gray-900 shadow-sm ring-1 ring-gray-200 hover:bg-gray-50">
            <Settings className="h-4 w-4" />Configurar stock
          </a>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <StatCard icon={<Package className="h-5 w-5 text-pink-600" />} label="Productos" value={products.length.toString()} />
        <StatCard icon={<AlertTriangle className="h-5 w-5 text-amber-600" />} label="Stock bajo" value={lowStock.toString()} />
        <StatCard icon={<AlertTriangle className="h-5 w-5 text-red-500" />} label="Agotados" value={outOfStock.toString()} />
        {isAdmin && <StatCard icon={<DollarSign className="h-5 w-5 text-emerald-600" />} label="Valor almacén" value={`S/. ${totalValue.toLocaleString("es-PE", { minimumFractionDigits: 2 })}`} />}
      </div>

      {isAdmin && pendingRequests.length > 0 && (
        <div id="solicitudes" className="rounded-lg bg-white p-5 shadow-sm ring-1 ring-blue-100">
          <div className="mb-4 flex items-center justify-between gap-3 border-b border-gray-100 pb-3">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-blue-600" />
              <div>
                <h2 className="font-bold text-gray-900">Solicitudes de reposición</h2>
                <p className="text-xs text-gray-700">Pedidos de stock enviados por los vendedores.</p>
              </div>
            </div>
            <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">
              {pendingRequests.length} pendiente{pendingRequests.length !== 1 ? "s" : ""}
            </span>
          </div>
          <ul className="divide-y divide-gray-100">
            {pendingRequests.map((req) => (
              <li key={req.id} className="flex flex-wrap items-center gap-3 py-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-gray-800">{req.product.name}</p>
                  <p className="text-xs text-gray-700">
                    {req.product.sku ? `${req.product.sku} · ` : ""}Solicitado por {req.requestedBy} · Stock actual {req.product.stock}
                    {req.note ? ` · ${req.note}` : ""}
                  </p>
                </div>
                <span className="rounded-md bg-blue-50 px-3 py-1 text-sm font-bold text-blue-700">+{req.quantityRequested} uds.</span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => handleRequestDecision(req.id, "APPROVED")}
                    disabled={busyRequestId === req.id}
                    aria-label="Aprobar solicitud de reposición"
                    className="inline-flex items-center gap-1.5 rounded-md bg-emerald-500 px-4 py-1.5 text-xs font-bold text-white hover:bg-emerald-600 disabled:opacity-60"
                  >
                    <Check className="h-3.5 w-3.5" />Aprobar
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRequestDecision(req.id, "REJECTED")}
                    disabled={busyRequestId === req.id}
                    aria-label="Rechazar solicitud de reposición"
                    className="inline-flex items-center gap-1.5 rounded-md bg-red-700 px-4 py-1.5 text-xs font-bold text-white hover:bg-red-800 disabled:opacity-60"
                  >
                    <X className="h-3.5 w-3.5" />Rechazar
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {isAdmin && (
        <form onSubmit={handleAdd} className="rounded-lg bg-white p-5 shadow-sm ring-1 ring-pink-100">
          <div className="mb-4 flex items-center justify-between gap-3 border-b border-gray-100 pb-3">
            <div>
              <h2 className="font-bold text-gray-900">Registro de producto</h2>
              <p className="text-xs text-gray-700">Talla, color HEX, precio y stock inicial.</p>
            </div>
            <span className="rounded-full bg-pink-50 px-3 py-1 text-xs font-bold text-pink-700">Alta rápida</span>
          </div>
          <div className="grid gap-4 md:grid-cols-6">
            <Field label="Producto" className="md:col-span-2" htmlFor="producto-input">
              <input id="producto-input" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="Ej. Falda corta" className="field" />
            </Field>
            <Field label="SKU / Código" htmlFor="sku-input">
              <input id="sku-input" value={formData.sku} onChange={(e) => setFormData({ ...formData, sku: e.target.value })} placeholder={generateSku(products)} className="field" />
            </Field>
            <Field label="Categoría" htmlFor="categoria-select">
              <select id="categoria-select" value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })} className="field bg-white">
                <option value="">Seleccionar</option>
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </Field>
            <Field label="Talla" htmlFor="talla-input">
              <input id="talla-input" list="size-options" value={formData.size} onChange={(e) => setFormData({ ...formData, size: e.target.value.trim() })} placeholder="Ej. S, 28 o Unitalla" className="field" />
            </Field>
            <Field label="Color HEX" htmlFor="color-hex">
              <div className="flex gap-2">
                <input type="color" id="color-hex" value={formData.color} onChange={(e) => setFormData({ ...formData, color: e.target.value })} className="h-10 w-12 rounded-md border border-gray-200 bg-white p-1" />
                <input id="color-value" value={formData.color} onChange={(e) => setFormData({ ...formData, color: e.target.value })} className="field flex-1 uppercase" aria-label="Código HEX del color" />
              </div>
            </Field>
            <Field label="Marca / Proveedor" className="md:col-span-2" htmlFor="marca-select">
              <select id="marca-select" value={formData.brand} onChange={(e) => setFormData({ ...formData, brand: e.target.value, brandCustom: "" })} className="field bg-white">
                <option value="">Seleccionar marca</option>
                {BRANDS.map((b) => <option key={b} value={b}>{b}</option>)}
              </select>
              {formData.brand === "Otro" && (
                <input id="marca-custom" value={formData.brandCustom} onChange={(e) => setFormData({ ...formData, brandCustom: e.target.value })} placeholder="Nombre de la marca" className="field mt-1" aria-label="Nombre personalizado de la marca" />
              )}
            </Field>
            <Field label="Precio ref." htmlFor="precio-ref">
              <input id="precio-ref" type="number" min="0" step="0.01" value={formData.referencePrice} onChange={(e) => setFormData({ ...formData, referencePrice: e.target.value })} placeholder="0.00" className="field" />
            </Field>
            <Field label="Precio venta" htmlFor="precio-venta">
              <input id="precio-venta" type="number" min="0" step="0.01" value={formData.price} onChange={(e) => setFormData({ ...formData, price: e.target.value })} placeholder="0.00" className="field" />
            </Field>
            <Field label="Stock" htmlFor="stock-input">
              <input id="stock-input" type="number" min="0" value={formData.stock} onChange={(e) => setFormData({ ...formData, stock: e.target.value })} placeholder="0" className="field" />
            </Field>
            <Field label="Notas / características" className="md:col-span-6" htmlFor="notas-input">
              <input id="notas-input" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} placeholder="Material, temporada, observaciones..." className="field" />
            </Field>
          </div>
          {formError && <p className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">{formError}</p>}
          <button type="submit" disabled={saving} aria-label="Guardar nuevo producto" className="mt-4 inline-flex items-center gap-2 rounded-md bg-pink-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-pink-700 disabled:opacity-60">
            <Save className="h-4 w-4" />{saving ? "Guardando..." : "Guardar producto"}
          </button>
        </form>
      )}

      {!isAdmin && formError && <p className="rounded-md bg-red-50 px-3 py-2 text-sm font-semibold text-red-600">{formError}</p>}

      <div className="rounded-lg bg-white shadow-sm ring-1 ring-gray-100">
        <div className="grid gap-3 border-b border-gray-100 p-4 md:grid-cols-[1fr_180px_160px]">
          <div className="relative">
              <label htmlFor="search-input" className="sr-only">Buscar productos</label>
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-600" />
            <input id="search-input" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Buscar por nombre, SKU, color, marca o categoría..." className="field pl-10" />
          </div>
          <div>
            <label htmlFor="category-filter" className="sr-only">Filtrar por categoría</label>
            <select id="category-filter" value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="field bg-white">
              <option value="todos">Todas las categorías</option>
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="status-filter" className="sr-only">Filtrar por estado</label>
            <select id="status-filter" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="field bg-white">
              <option value="todos">Todos los estados</option>
              <option value="ok">OK</option>
              <option value="bajo">Bajo</option>
              <option value="critico">Crítico</option>
              <option value="agotado">Agotado</option>
            </select>
          </div>
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
                  <th className="px-5 py-3 text-left font-medium">Categoría</th>
                  <th className="px-5 py-3 text-right font-medium">Stock</th>
                  <th className="px-5 py-3 text-right font-medium">{isAdmin ? "Nuevo stock" : "Solicitar"}</th>
                  {isAdmin && <th className="px-5 py-3 text-right font-medium">Precio ref.</th>}
                  <th className="px-5 py-3 text-right font-medium">Precio</th>
                  {isAdmin && <th className="px-5 py-3 text-center font-medium">Acciones</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredProducts.length === 0 ? (
                  <tr><td colSpan={colSpan} className="px-5 py-10 text-center text-gray-400">No hay productos con esos filtros</td></tr>
                ) : filteredProducts.map((product, index) => {
                  const status = getStatus(product.stock);
                  const justRequested = requestedIds[product.id];
                  const hasMultipleSizes = hasMultipleValues(product.size);
                  return (
                    <tr key={product.id} className="transition-colors hover:bg-pink-50/40">
                      <td className="px-5 py-3">
                        <p className="font-mono text-xs text-gray-600">{product.sku || String(index + 1).padStart(3, "0")}</p>
                        <p className="font-mono text-[10px] text-gray-500">{product.id.slice(0, 6)}</p>
                      </td>
                      <td className="px-5 py-3">
                        <p className="font-semibold text-gray-800">{product.name}</p>
                        <p className="max-w-[220px] truncate text-xs text-gray-700">{product.description || product.brand || "Sin notas"}</p>
                      </td>
                      <td className="px-5 py-3 text-gray-700">
                        <p className={hasMultipleSizes ? "font-semibold text-red-600" : ""}>{product.size || "-"}</p>
                        {hasMultipleSizes && <p className="text-[10px] font-semibold text-red-600">Separar en SKUs por talla</p>}
                        <div className="flex items-center gap-2 text-xs text-gray-600">
                          <span className="h-3 w-3 rounded-full border" style={{ backgroundColor: product.color || "#fff" }} />
                          {product.color || "-"}
                        </div>
                      </td>
                      <td className="px-5 py-3 text-gray-700">{product.category}</td>
                      <td className="px-5 py-3 text-right">
                        <div className="inline-flex items-center justify-end gap-2">
                          <span className={`font-bold ${status.className}`}>{String(product.stock).padStart(2, "0")}</span>
                          {status.id !== "ok" && (
                            <span className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-bold ${status.alertClass}`}>
                              <Bell className="h-3 w-3" />{status.label}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-3">
                        {isAdmin ? (
                          <div className="flex items-center justify-end gap-2">
                            <input type="number" min="1" value={stockEntries[product.id] || ""} onChange={(e) => setStockEntries((prev) => ({ ...prev, [product.id]: e.target.value }))} placeholder="+" className="h-8 w-16 rounded-md border border-gray-200 px-2 text-right text-xs focus:outline-none focus:ring-2 focus:ring-pink-400" aria-label={`Cantidad a registrar para ${product.name}`} />
                            <button type="button" onClick={() => handleStockEntry(product)} disabled={updatingStockId === product.id} aria-label={`Registrar entrada de stock para ${product.name}`} className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-pink-600 text-white hover:bg-pink-700 disabled:opacity-60" title="Registrar entrada">
                              <Plus className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-end gap-2">
                            {justRequested ? (
                              <span className="inline-flex items-center gap-1 rounded-md bg-emerald-100 px-3 py-1.5 text-xs font-semibold text-emerald-800">
                                <CheckCircle className="h-3.5 w-3.5" />Enviada
                              </span>
                            ) : (
                              <>
                                <input type="number" min="1" value={stockEntries[product.id] || ""} onChange={(e) => setStockEntries((prev) => ({ ...prev, [product.id]: e.target.value }))} placeholder="Cant." className="h-8 w-16 rounded-md border border-gray-200 px-2 text-right text-xs focus:outline-none focus:ring-2 focus:ring-pink-400" aria-label={`Cantidad a solicitar para ${product.name}`} />
                                <button type="button" onClick={() => handleStockRequest(product)} disabled={updatingStockId === product.id} aria-label={`Solicitar reposición de ${product.name}`} className="inline-flex h-8 items-center gap-1.5 rounded-md bg-blue-600 px-3 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-60">
                                  <Send className="h-3 w-3" />Solicitar
                                </button>
                              </>
                            )}
                          </div>
                        )}
                      </td>
                      {isAdmin && <td className="px-5 py-3 text-right text-gray-700">{product.referencePrice ? `S/. ${product.referencePrice.toFixed(2)}` : "-"}</td>}
                      <td className="px-5 py-3 text-right font-semibold text-gray-900">S/. {product.price.toFixed(2)}</td>
                      {isAdmin && (
                        <td className="px-5 py-3 text-center">
                          <div className="inline-flex gap-1">
                            <button onClick={() => openEdit(product)} aria-label={`Editar producto ${product.name}`} className="rounded-md p-2 text-gray-600 hover:bg-blue-50 hover:text-blue-600" title="Editar producto">
                              <Pencil className="h-4 w-4" />
                            </button>
                            <button onClick={() => handleDelete(product.id)} aria-label={`Eliminar producto ${product.name}`} className="rounded-md p-2 text-gray-600 hover:bg-red-50 hover:text-red-600" title="Eliminar producto">
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {editProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl overflow-y-auto rounded-xl bg-white shadow-2xl max-h-[90vh]">
            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
              <div>
                <h3 className="font-bold text-gray-900">Editar producto</h3>
                <p className="text-xs text-gray-600">{editProduct.sku || editProduct.id.slice(0, 8)}</p>
              </div>
              <button onClick={() => setEditProduct(null)} aria-label="Cerrar diálogo de edición" className="rounded-md p-1 text-gray-500 hover:bg-gray-100 hover:text-gray-700"><X className="h-5 w-5" /></button>
            </div>
            <div className="grid gap-4 p-6 md:grid-cols-3">
              <Field label="Nombre" className="md:col-span-2" htmlFor="edit-nombre">
                <input id="edit-nombre" value={editForm.name || ""} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} className="field" />
              </Field>
              <Field label="SKU / Codigo" htmlFor="edit-sku">
                <input id="edit-sku" value={editForm.sku || ""} onChange={(e) => setEditForm({ ...editForm, sku: e.target.value })} className="field" />
              </Field>
              <Field label="Categoría" htmlFor="edit-categoria">
                <select id="edit-categoria" value={editForm.category || ""} onChange={(e) => setEditForm({ ...editForm, category: e.target.value })} className="field bg-white">
                  {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </Field>
              <Field label="Talla" htmlFor="edit-talla">
                <input id="edit-talla" list="size-options" value={editForm.size || ""} onChange={(e) => setEditForm({ ...editForm, size: e.target.value.trim() })} placeholder="Ej. S, 28 o Unitalla" className="field" />
              </Field>
              <Field label="Color HEX" htmlFor="edit-color-hex">
                <div className="flex gap-2">
                  <input type="color" id="edit-color-hex" value={editForm.color || "#e85b9c"} onChange={(e) => setEditForm({ ...editForm, color: e.target.value })} className="h-10 w-12 rounded-md border border-gray-200 bg-white p-1" />
                  <input id="edit-color-value" value={editForm.color || ""} onChange={(e) => setEditForm({ ...editForm, color: e.target.value })} className="field flex-1 uppercase" aria-label="Código HEX del color" />
                </div>
              </Field>
              <Field label="Marca / Proveedor" htmlFor="edit-marca">
                <select id="edit-marca" value={editForm.brand || ""} onChange={(e) => setEditForm({ ...editForm, brand: e.target.value, brandCustom: "" })} className="field bg-white">
                  <option value="">Sin marca</option>
                  {BRANDS.map((b) => <option key={b} value={b}>{b}</option>)}
                </select>
                {editForm.brand === "Otro" && (
                  <input id="edit-marca-custom" value={editForm.brandCustom || ""} onChange={(e) => setEditForm({ ...editForm, brandCustom: e.target.value })} placeholder="Nombre de la marca" className="field mt-1" aria-label="Nombre personalizado de la marca" />
                )}
              </Field>
              <Field label="Precio ref." htmlFor="edit-precio-ref">
                <input id="edit-precio-ref" type="number" min="0" step="0.01" value={editForm.referencePrice || ""} onChange={(e) => setEditForm({ ...editForm, referencePrice: e.target.value })} placeholder="0.00" className="field" />
              </Field>
              <Field label="Precio venta" htmlFor="edit-precio-venta">
                <input id="edit-precio-venta" type="number" min="0" step="0.01" value={editForm.price || ""} onChange={(e) => setEditForm({ ...editForm, price: e.target.value })} placeholder="0.00" className="field" />
              </Field>
              <Field label="Notas / características" className="md:col-span-3" htmlFor="edit-notas">
                <input id="edit-notas" value={editForm.description || ""} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })} className="field" />
              </Field>
            </div>
            {editError && <p className="mx-6 mb-4 rounded-md bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">{editError}</p>}
            <div className="flex justify-end gap-3 border-t border-gray-100 px-6 py-4">
              <button onClick={() => setEditProduct(null)} className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 hover:text-gray-900">Cancelar</button>
              <button onClick={handleEditSave} disabled={editSaving} aria-label="Guardar cambios del producto" className="inline-flex items-center gap-2 rounded-lg bg-pink-600 px-5 py-2 text-sm font-bold text-white hover:bg-pink-700 disabled:opacity-60">
                <Save className="h-4 w-4" />{editSaving ? "Guardando..." : "Guardar cambios"}
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .field { width:100%; border-radius:0.375rem; border:1px solid rgb(209 213 219); padding:0.625rem 0.75rem; font-size:0.875rem; outline:none; color: rgb(17 24 39); }
        .field:focus { box-shadow:0 0 0 2px rgb(244 114 182); border-color: rgb(236 72 153); }
        .field::placeholder { color: rgb(107 114 128); }
      `}</style>
    </div>
  );
}

function Field({ label, className = "", children, htmlFor }: { label: string; className?: string; children: React.ReactNode; htmlFor?: string }) {
  return (
    <div className={`space-y-1 ${className}`}>
      {htmlFor && <label htmlFor={htmlFor} className="text-xs font-semibold uppercase tracking-wide text-gray-700 block">{label}</label>}
      {!htmlFor && <span className="text-xs font-semibold uppercase tracking-wide text-gray-700 block">{label}</span>}
      {children}
    </div>
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
