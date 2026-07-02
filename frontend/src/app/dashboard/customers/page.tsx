"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, BadgeCheck, Mail, Pencil, Phone, Search, Trash2, UserPlus, Users, X } from "lucide-react";
import { type Customer, getCustomers, createCustomer, updateCustomer, deleteCustomer } from "@/frontend/lib/customers/api";

const emptyForm = { name: "", dni: "", email: "", phone: "" };

const normalizePhone = (phone: string) => phone.replace(/\D/g, "").slice(0, 9);
const validatePhone = (phone: string) => phone === "" || /^9\d{8}$/.test(phone);

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [formError, setFormError] = useState("");
  const [formData, setFormData] = useState(emptyForm);
  const [editId, setEditId] = useState<string | null>(null);
  const [fromCaja, setFromCaja] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    getCustomers()
      .then((data) => setCustomers(data))
      .catch(() => setCustomers([]))
      .finally(() => setLoading(false));

    const params = new URLSearchParams(window.location.search);
    const registerDni = params.get("registerDni");
    const from = params.get("from");
    if (from === "caja") setFromCaja(true);
    if (registerDni) {
      setShowForm(true);
      setFormData((prev) => ({ ...prev, dni: registerDni.replace(/\D/g, "").slice(0, 8) }));
    }
  }, []);

  const filtered = useMemo(() => {
    const q = searchTerm.toLowerCase().trim();
    return customers.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.dni.includes(q) ||
        (c.email ?? "").toLowerCase().includes(q) ||
        (c.phone ?? "").includes(q)
    );
  }, [customers, searchTerm]);

  const validate = () => {
    if (!formData.name.trim()) return "Ingresa el nombre completo.";
    if (!/^\d{8}$/.test(formData.dni)) return "El DNI debe tener 8 dígitos.";
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email))
      return "Correo inválido.";
    if (!validatePhone(formData.phone))
      return "Teléfono inválido. Ingresa un número de 9 dígitos (ej: 987654321).";
    return "";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const error = validate();
    if (error) { setFormError(error); return; }

    setSubmitting(true);
    setFormError("");
    try {
      if (editId) {
        const updated = await updateCustomer(editId, {
          name: formData.name.trim(),
          email: formData.email.trim() || undefined,
          phone: formData.phone.trim() || undefined,
        });
        setCustomers((prev) => prev.map((c) => (c.id === editId ? updated : c)));
        setEditId(null);
      } else {
        const created = await createCustomer({
          name: formData.name.trim(),
          dni: formData.dni,
          email: formData.email.trim() || undefined,
          phone: formData.phone.trim() || undefined,
        });
        setCustomers((prev) => [created, ...prev]);
      }
      setFormData(emptyForm);
      setShowForm(false);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Error al guardar cliente");
    } finally {
      setSubmitting(false);
    }
  };

  const startEdit = (c: Customer) => {
    setEditId(c.id);
    setFormData({ name: c.name, dni: c.dni, email: c.email ?? "", phone: c.phone ?? "" });
    setFormError("");
    setShowForm(true);
  };

  const cancelForm = () => {
    setShowForm(false);
    setEditId(null);
    setFormData(emptyForm);
    setFormError("");
  };

  const handleDelete = async (c: Customer) => {
    if (!confirm(`¿Eliminar a ${c.name}?`)) return;
    try {
      await deleteCustomer(c.id);
      setCustomers((prev) => prev.filter((item) => item.id !== c.id));
    } catch (err) {
      alert(err instanceof Error ? err.message : "Error al eliminar cliente");
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Clientes</h1>
          <p className="text-sm text-gray-500">Registra clientes para asociarlos a ventas en caja.</p>
        </div>
        <div className="flex gap-2">
          {fromCaja && (
            <a
              href="/dashboard/caja"
              className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-bold text-gray-700 hover:bg-gray-50"
            >
              <ArrowLeft className="h-4 w-4" />
              Volver a Caja
            </a>
          )}
          <button
            type="button"
            onClick={() => { cancelForm(); setShowForm(true); }}
            className="inline-flex items-center gap-2 rounded-lg bg-pink-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-pink-700"
          >
            <UserPlus className="h-4 w-4" />
            Registrar cliente
          </button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard icon={<Users className="h-5 w-5 text-pink-600" />} color="pink" label="Total clientes" value={customers.length} />
        <StatCard icon={<BadgeCheck className="h-5 w-5 text-emerald-600" />} color="emerald" label="Con DNI válido" value={customers.filter((c) => /^\d{8}$/.test(c.dni)).length} />
        <StatCard icon={<Mail className="h-5 w-5 text-blue-600" />} color="blue" label="Con correo" value={customers.filter((c) => c.email).length} />
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="rounded-lg bg-white p-5 shadow-sm ring-1 ring-gray-100">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-bold text-gray-800">{editId ? "Editar cliente" : "Nuevo cliente"}</h2>
            <button type="button" onClick={cancelForm}><X className="h-4 w-4 text-gray-400 hover:text-gray-600" /></button>
          </div>
          <div className="grid gap-4 md:grid-cols-4">
            <label className="space-y-1 md:col-span-2">
              <span className="text-xs font-semibold text-gray-500">Nombre completo *</span>
              <input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="Ej. María López" className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-400" />
            </label>
            <label className="space-y-1">
              <span className="text-xs font-semibold text-gray-500">DNI *</span>
              <input inputMode="numeric" maxLength={8} disabled={!!editId} value={formData.dni} onChange={(e) => setFormData({ ...formData, dni: e.target.value.replace(/\D/g, "") })} placeholder="12345678" className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-400 disabled:bg-gray-50" />
            </label>
            <label className="space-y-1">
              <span className="text-xs font-semibold text-gray-500">Teléfono (opcional)</span>
              <input inputMode="numeric" maxLength={9} value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: normalizePhone(e.target.value) })} placeholder="987654321" className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-400" />
              {formData.phone && !validatePhone(formData.phone) && (
                <p className="text-[11px] text-red-500">Debe tener 9 dígitos (ej: 987654321)</p>
              )}
            </label>
            <label className="space-y-1 md:col-span-3">
              <span className="text-xs font-semibold text-gray-500">Correo (opcional)</span>
              <input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} placeholder="cliente@correo.com" className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-400" />
            </label>
            <button type="submit" disabled={submitting} className="self-end rounded-md bg-pink-600 px-4 py-2 text-sm font-bold text-white hover:bg-pink-700 disabled:opacity-60">
              {submitting ? "Guardando..." : editId ? "Guardar cambios" : "Registrar"}
            </button>
          </div>
          {formError && <p className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm font-semibold text-red-600">{formError}</p>}
        </form>
      )}

      <div className="overflow-hidden rounded-lg bg-white shadow-sm ring-1 ring-gray-100">
        <div className="border-b border-gray-100 p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input type="text" placeholder="Buscar por nombre, DNI, correo o teléfono..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full rounded-md border border-gray-200 py-2 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-pink-400" />
          </div>
        </div>
        {loading ? (
          <div className="px-5 py-10 text-center text-sm text-gray-400">Cargando clientes...</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-pink-50 text-pink-700">
              <tr>
                <th className="px-5 py-3 text-left font-medium">Cliente</th>
                <th className="px-5 py-3 text-left font-medium">DNI</th>
                <th className="px-5 py-3 text-left font-medium">Contacto</th>
                <th className="px-5 py-3 text-left font-medium">Registro</th>
                <th className="px-5 py-3 text-center font-medium">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.length === 0 ? (
                <tr><td colSpan={5} className="px-5 py-10 text-center text-gray-400">No se encontraron clientes</td></tr>
              ) : (
                filtered.map((c) => (
                  <tr key={c.id} className="transition-colors hover:bg-pink-50/40">
                    <td className="px-5 py-3 font-semibold text-gray-800">{c.name}</td>
                    <td className="px-5 py-3 font-mono text-gray-600">{c.dni}</td>
                    <td className="px-5 py-3 text-gray-500">
                      <div className="space-y-0.5">
                        {c.email && <span className="flex items-center gap-1 text-xs"><Mail className="h-3 w-3" />{c.email}</span>}
                        {c.phone && <span className="flex items-center gap-1 text-xs"><Phone className="h-3 w-3" />{c.phone}</span>}
                        {!c.email && !c.phone && <span className="text-xs text-gray-300">Sin contacto</span>}
                      </div>
                    </td>
                    <td className="px-5 py-3 text-xs text-gray-400">{new Date(c.createdAt).toLocaleDateString("es-CO")}</td>
                    <td className="px-5 py-3 text-center">
                      <div className="inline-flex gap-2">
                        <button onClick={() => startEdit(c)} className="inline-flex items-center gap-1 rounded-md border border-blue-100 bg-blue-50 px-2.5 py-1.5 text-xs font-bold text-blue-600 hover:bg-blue-100">
                          <Pencil className="h-3.5 w-3.5" />Editar
                        </button>
                        <button onClick={() => handleDelete(c)} className="inline-flex items-center gap-1 rounded-md border border-red-100 bg-red-50 px-2.5 py-1.5 text-xs font-bold text-red-600 hover:bg-red-100">
                          <Trash2 className="h-3.5 w-3.5" />Eliminar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function StatCard({ icon, color, label, value }: { icon: React.ReactNode; color: string; label: string; value: number }) {
  const colors: Record<string, string> = { pink: "border-pink-100 bg-pink-100", emerald: "border-emerald-100 bg-emerald-100", blue: "border-blue-100 bg-blue-100" };
  return (
    <div className={`flex items-center gap-4 rounded-lg border bg-white p-5 shadow-sm border-${color}-100`}>
      <div className={`rounded-md p-3 ${colors[color]}`}>{icon}</div>
      <div>
        <p className="text-xs uppercase tracking-wide text-gray-500">{label}</p>
        <p className="text-2xl font-bold text-gray-800">{value}</p>
      </div>
    </div>
  );
}
