"use client";

import { useEffect, useMemo, useState } from "react";
import { BadgeCheck, Mail, Phone, Search, Trash2, UserPlus, Users } from "lucide-react";

const CUSTOMER_STORAGE_KEY = "top-modas-customers";

type Customer = {
  id: string;
  name: string;
  dni: string;
  email: string;
  phone: string;
  createdAt: string;
};

const emptyForm = {
  name: "",
  dni: "",
  email: "",
  phone: "",
};

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [formError, setFormError] = useState("");
  const [formData, setFormData] = useState(emptyForm);

  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem(CUSTOMER_STORAGE_KEY) || "[]") as Customer[];
      setCustomers(Array.isArray(stored) ? stored : []);
    } catch {
      setCustomers([]);
    }

    const params = new URLSearchParams(window.location.search);
    const registerDni = params.get("registerDni");
    if (registerDni) {
      setShowForm(true);
      setFormData((prev) => ({ ...prev, dni: registerDni.replace(/\D/g, "").slice(0, 8) }));
    }
  }, []);

  const filtered = useMemo(() => {
    const q = searchTerm.toLowerCase().trim();
    return customers.filter(
      (customer) =>
        customer.name.toLowerCase().includes(q) ||
        customer.dni.includes(q) ||
        customer.email.toLowerCase().includes(q)
    );
  }, [customers, searchTerm]);

  const saveCustomers = (nextCustomers: Customer[]) => {
    setCustomers(nextCustomers);
    localStorage.setItem(CUSTOMER_STORAGE_KEY, JSON.stringify(nextCustomers));
  };

  const validate = () => {
    if (!formData.name.trim()) return "Ingresa el nombre completo del cliente.";
    if (!/^\d{8}$/.test(formData.dni)) return "El DNI debe tener 8 numeros.";
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) return "Ingresa un correo valido.";
    if (customers.some((customer) => customer.dni === formData.dni)) return "Ya existe un cliente con ese DNI.";
    return "";
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const error = validate();
    if (error) {
      setFormError(error);
      return;
    }

    const customer: Customer = {
      id: crypto.randomUUID(),
      name: formData.name.trim(),
      dni: formData.dni,
      email: formData.email.trim(),
      phone: formData.phone.trim(),
      createdAt: new Date().toISOString(),
    };

    saveCustomers([customer, ...customers]);
    setFormData(emptyForm);
    setFormError("");
    setShowForm(false);
  };

  const handleDelete = (customer: Customer) => {
    if (!confirm(`Eliminar al cliente ${customer.name}?`)) return;
    saveCustomers(customers.filter((item) => item.id !== customer.id));
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Clientes</h1>
          <p className="text-sm text-gray-500">Registra los clientes que luego se validan en caja.</p>
        </div>
        <button
          type="button"
          onClick={() => setShowForm((value) => !value)}
          className="inline-flex items-center gap-2 rounded-lg bg-pink-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-pink-700"
        >
          <UserPlus className="h-4 w-4" />
          Registrar cliente
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="flex items-center gap-4 rounded-lg border border-pink-100 bg-white p-5 shadow-sm">
          <div className="rounded-md bg-pink-100 p-3">
            <Users className="h-5 w-5 text-pink-600" />
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-gray-500">Total clientes</p>
            <p className="text-2xl font-bold text-gray-800">{customers.length}</p>
          </div>
        </div>
        <div className="flex items-center gap-4 rounded-lg border border-emerald-100 bg-white p-5 shadow-sm">
          <div className="rounded-md bg-emerald-100 p-3">
            <BadgeCheck className="h-5 w-5 text-emerald-600" />
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-gray-500">Con DNI valido</p>
            <p className="text-2xl font-bold text-gray-800">{customers.filter((customer) => /^\d{8}$/.test(customer.dni)).length}</p>
          </div>
        </div>
        <div className="flex items-center gap-4 rounded-lg border border-blue-100 bg-white p-5 shadow-sm">
          <div className="rounded-md bg-blue-100 p-3">
            <Mail className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-gray-500">Con correo</p>
            <p className="text-2xl font-bold text-gray-800">{customers.filter((customer) => customer.email).length}</p>
          </div>
        </div>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="rounded-lg bg-white p-5 shadow-sm ring-1 ring-gray-100">
          <div className="grid gap-4 md:grid-cols-4">
            <label className="space-y-1 md:col-span-2">
              <span className="text-xs font-semibold text-gray-500">Nombre completo</span>
              <input
                value={formData.name}
                onChange={(event) => setFormData({ ...formData, name: event.target.value })}
                placeholder="Ej. Maria Lopez"
                className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-400"
              />
            </label>
            <label className="space-y-1">
              <span className="text-xs font-semibold text-gray-500">DNI</span>
              <input
                inputMode="numeric"
                maxLength={8}
                value={formData.dni}
                onChange={(event) => setFormData({ ...formData, dni: event.target.value.replace(/\D/g, "") })}
                placeholder="12345678"
                className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-400"
              />
            </label>
            <label className="space-y-1">
              <span className="text-xs font-semibold text-gray-500">Telefono</span>
              <input
                value={formData.phone}
                onChange={(event) => setFormData({ ...formData, phone: event.target.value })}
                placeholder="999999999"
                className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-400"
              />
            </label>
            <label className="space-y-1 md:col-span-3">
              <span className="text-xs font-semibold text-gray-500">Correo</span>
              <input
                type="email"
                value={formData.email}
                onChange={(event) => setFormData({ ...formData, email: event.target.value })}
                placeholder="cliente@correo.com"
                className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-400"
              />
            </label>
            <button
              type="submit"
              className="self-end rounded-md bg-pink-600 px-4 py-2 text-sm font-bold text-white hover:bg-pink-700"
            >
              Guardar cliente
            </button>
          </div>
          {formError && <p className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm font-semibold text-red-600">{formError}</p>}
        </form>
      )}

      <div className="overflow-hidden rounded-lg bg-white shadow-sm ring-1 ring-gray-100">
        <div className="border-b border-gray-100 p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por nombre, DNI o correo..."
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              className="w-full rounded-md border border-gray-200 py-2 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-pink-400"
            />
          </div>
        </div>

        <table className="w-full text-sm">
          <thead className="bg-pink-50 text-pink-700">
            <tr>
              <th className="px-5 py-3 text-left font-medium">Cliente</th>
              <th className="px-5 py-3 text-left font-medium">DNI</th>
              <th className="px-5 py-3 text-left font-medium">Contacto</th>
              <th className="px-5 py-3 text-left font-medium">Registro</th>
              <th className="px-5 py-3 text-center font-medium">Accion</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-5 py-10 text-center text-gray-400">
                  No se encontraron clientes registrados
                </td>
              </tr>
            ) : (
              filtered.map((customer) => (
                <tr key={customer.id} className="transition-colors hover:bg-pink-50/40">
                  <td className="px-5 py-3 font-semibold text-gray-800">{customer.name}</td>
                  <td className="px-5 py-3 font-mono text-gray-600">{customer.dni}</td>
                  <td className="px-5 py-3 text-gray-500">
                    <div className="space-y-1">
                      {customer.email && (
                        <span className="flex items-center gap-1">
                          <Mail className="h-3 w-3" />
                          {customer.email}
                        </span>
                      )}
                      {customer.phone && (
                        <span className="flex items-center gap-1">
                          <Phone className="h-3 w-3" />
                          {customer.phone}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-5 py-3 text-xs text-gray-400">{new Date(customer.createdAt).toLocaleDateString("es-PE")}</td>
                  <td className="px-5 py-3 text-center">
                    <button
                      type="button"
                      onClick={() => handleDelete(customer)}
                      className="inline-flex items-center gap-1 rounded-md border border-red-100 bg-red-50 px-2.5 py-1.5 text-xs font-bold text-red-600 hover:bg-red-100"
                      title="Eliminar cliente"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Eliminar
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
