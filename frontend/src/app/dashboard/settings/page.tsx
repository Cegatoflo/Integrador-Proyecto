"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, Check, KeyRound, Pencil, RotateCcw, Save, Shield, SlidersHorizontal, TriangleAlert, UserPlus, Users, X } from "lucide-react";
import { getUsers, createUser, updateUser, resetUserPassword, type AppUser } from "@/frontend/lib/dashboard/api";

const INVENTORY_SETTINGS_KEY = "top-modas-inventory-settings";
const RETURNS_POLICY_KEY = "top-modas-returns-policy";

type InventorySettings = { lowStockLimit: number; criticalStockLimit: number };
type ReturnsPolicy = { maxDays: number; requireApproval: boolean };

const defaultSettings: InventorySettings = { lowStockLimit: 10, criticalStockLimit: 3 };
const defaultPolicy: ReturnsPolicy = { maxDays: 30, requireApproval: true };

export default function SettingsPage() {
  const [role, setRole] = useState<"ADMIN" | "USER" | null>(null);
  const [currentEmail, setCurrentEmail] = useState("");

  const [settings, setSettings] = useState<InventorySettings>(defaultSettings);
  const [saved, setSaved] = useState(false);

  const [policy, setPolicy] = useState<ReturnsPolicy>(defaultPolicy);
  const [policySaved, setPolicySaved] = useState(false);

  const [users, setUsers] = useState<AppUser[]>([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [feedback, setFeedback] = useState("");
  const [error, setError] = useState("");

  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({ name: "", lastName: "", email: "", password: "", role: "USER" as "ADMIN" | "USER" });
  const [creating, setCreating] = useState(false);

  const [editUser, setEditUser] = useState<AppUser | null>(null);
  const [editForm, setEditForm] = useState({ name: "", lastName: "", role: "USER" as "ADMIN" | "USER", isActive: true });
  const [savingEdit, setSavingEdit] = useState(false);

  const [resetTarget, setResetTarget] = useState<AppUser | null>(null);
  const [resetPwd, setResetPwd] = useState("");
  const [resetting, setResetting] = useState(false);

  useEffect(() => {
    let isAdmin = false;
    try {
      const user = JSON.parse(localStorage.getItem("top-modas-user") || "{}") as { role?: "ADMIN" | "USER"; email?: string };
      isAdmin = user.role === "ADMIN";
      setRole(isAdmin ? "ADMIN" : "USER");
      setCurrentEmail(user.email || "");
    } catch {
      setRole("USER");
    }

    try {
      const stored = JSON.parse(localStorage.getItem(INVENTORY_SETTINGS_KEY) || "null") as InventorySettings | null;
      if (stored) setSettings({ ...defaultSettings, ...stored });
    } catch {
      setSettings(defaultSettings);
    }

    try {
      const storedPolicy = JSON.parse(localStorage.getItem(RETURNS_POLICY_KEY) || "null") as ReturnsPolicy | null;
      if (storedPolicy) setPolicy({ ...defaultPolicy, ...storedPolicy });
    } catch {
      setPolicy(defaultPolicy);
    }

    if (isAdmin) {
      getUsers()
        .then(setUsers)
        .catch(() => setError("No se pudieron cargar los usuarios."))
        .finally(() => setUsersLoading(false));
    } else {
      setUsersLoading(false);
    }
  }, []);

  const flash = (msg: string) => {
    setFeedback(msg);
    setTimeout(() => setFeedback(""), 2200);
  };

  if (role === null) {
    return <div className="py-10 text-center text-sm text-gray-400">Verificando permisos...</div>;
  }

  if (role !== "ADMIN") {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="max-w-md rounded-lg bg-white p-8 text-center shadow-sm ring-1 ring-gray-100">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-amber-100">
            <AlertTriangle className="h-7 w-7 text-amber-600" />
          </div>
          <h1 className="text-xl font-bold text-gray-900">No puedes entrar a configuracion</h1>
          <p className="mt-2 text-sm text-gray-500">Tu rol de vendedor no tiene permiso para modificar parametros del sistema.</p>
          <a href="/dashboard/caja" className="mt-5 inline-flex rounded-md bg-pink-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-pink-700">
            Ir a Caja
          </a>
        </div>
      </div>
    );
  }

  const saveSettings = (event: React.FormEvent) => {
    event.preventDefault();
    const normalized = {
      lowStockLimit: Math.max(1, Number(settings.lowStockLimit)),
      criticalStockLimit: Math.max(0, Number(settings.criticalStockLimit)),
    };
    localStorage.setItem(INVENTORY_SETTINGS_KEY, JSON.stringify(normalized));
    setSettings(normalized);
    setSaved(true);
    setTimeout(() => setSaved(false), 1800);
  };

  const savePolicy = (event: React.FormEvent) => {
    event.preventDefault();
    const normalized = { maxDays: Math.max(0, Number(policy.maxDays)), requireApproval: policy.requireApproval };
    localStorage.setItem(RETURNS_POLICY_KEY, JSON.stringify(normalized));
    setPolicy(normalized);
    setPolicySaved(true);
    setTimeout(() => setPolicySaved(false), 1800);
  };

  const handleCreate = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    if (!createForm.name.trim() || !createForm.lastName.trim() || !createForm.email.trim() || createForm.password.length < 6) {
      setError("Completa nombre, apellido, correo y una contraseña de al menos 6 caracteres.");
      return;
    }
    setCreating(true);
    try {
      const user = await createUser(createForm);
      setUsers((prev) => [user, ...prev]);
      setShowCreate(false);
      setCreateForm({ name: "", lastName: "", email: "", password: "", role: "USER" });
      flash("Usuario creado.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al crear usuario");
    } finally {
      setCreating(false);
    }
  };

  const openEdit = (u: AppUser) => {
    setEditUser(u);
    setEditForm({ name: u.name, lastName: u.lastName, role: u.role, isActive: u.isActive });
    setError("");
  };

  const handleEditSave = async () => {
    if (!editUser) return;
    setSavingEdit(true);
    setError("");
    try {
      const updated = await updateUser(editUser.id, editForm);
      setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
      setEditUser(null);
      flash("Cambios guardados.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al actualizar usuario");
    } finally {
      setSavingEdit(false);
    }
  };

  const toggleActive = async (u: AppUser) => {
    try {
      const updated = await updateUser(u.id, { isActive: !u.isActive });
      setUsers((prev) => prev.map((x) => (x.id === updated.id ? updated : x)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al actualizar usuario");
    }
  };

  const handleReset = async () => {
    if (!resetTarget) return;
    if (resetPwd.length < 6) {
      setError("La nueva contraseña debe tener al menos 6 caracteres.");
      return;
    }
    setResetting(true);
    setError("");
    try {
      await resetUserPassword(resetTarget.id, resetPwd);
      setResetTarget(null);
      setResetPwd("");
      flash("Contraseña actualizada.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al actualizar contraseña");
    } finally {
      setResetting(false);
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Configuracion</h1>
        <p className="text-sm text-gray-500">Parametros de inventario, devoluciones y gestion de usuarios.</p>
      </div>

      {feedback && (
        <div className="flex items-center gap-2 rounded-lg bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
          <Check className="h-4 w-4" /> {feedback}
        </div>
      )}
      {error && (
        <div className="flex items-center justify-between rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
          <button className="ml-2 font-medium underline" onClick={() => setError("")}>Cerrar</button>
        </div>
      )}

      {/* Parametros del sistema: inventario y devoluciones lado a lado */}
      <div className="grid gap-5 lg:grid-cols-2">
      {/* Alertas de inventario */}
      <form onSubmit={saveSettings} className="flex flex-col rounded-lg bg-white p-6 shadow-sm ring-1 ring-gray-100">
        <div className="mb-5 flex items-center gap-3 border-b border-gray-100 pb-4">
          <div className="rounded-md bg-pink-100 p-3"><SlidersHorizontal className="h-5 w-5 text-pink-600" /></div>
          <div>
            <h2 className="font-bold text-gray-900">Alertas de inventario</h2>
            <p className="text-sm text-gray-500">Estos limites se aplican en inventario y dashboard.</p>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="space-y-2">
            <span className="text-sm font-semibold text-gray-700">Stock bajo</span>
            <input type="number" min="1" value={settings.lowStockLimit} onChange={(e) => setSettings({ ...settings, lowStockLimit: Number(e.target.value) })} className="w-full rounded-md border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-pink-400" />
            <span className="text-xs text-gray-500">Desde este valor aparece como Bajo.</span>
          </label>
          <label className="space-y-2">
            <span className="text-sm font-semibold text-gray-700">Stock critico</span>
            <input type="number" min="0" value={settings.criticalStockLimit} onChange={(e) => setSettings({ ...settings, criticalStockLimit: Number(e.target.value) })} className="w-full rounded-md border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-pink-400" />
            <span className="text-xs text-gray-500">Desde este valor aparece como Critico.</span>
          </label>
        </div>
        {settings.criticalStockLimit > settings.lowStockLimit && (
          <div className="mt-4 flex items-center gap-2 rounded-md bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-700">
            <TriangleAlert className="h-4 w-4" /> El stock critico no deberia ser mayor que el stock bajo.
          </div>
        )}
        <button type="submit" className="mt-6 inline-flex items-center gap-2 rounded-md bg-pink-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-pink-700">
          <Save className="h-4 w-4" /> {saved ? "Guardado" : "Guardar configuracion"}
        </button>
      </form>

      {/* Politica de devoluciones */}
      <form onSubmit={savePolicy} className="flex flex-col rounded-lg bg-white p-6 shadow-sm ring-1 ring-gray-100">
        <div className="mb-5 flex items-center gap-3 border-b border-gray-100 pb-4">
          <div className="rounded-md bg-rose-100 p-3"><RotateCcw className="h-5 w-5 text-rose-600" /></div>
          <div>
            <h2 className="font-bold text-gray-900">Politica de devoluciones</h2>
            <p className="text-sm text-gray-500">Reglas para aceptar devoluciones de ventas.</p>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="space-y-2">
            <span className="text-sm font-semibold text-gray-700">Dias limite para aceptar</span>
            <input type="number" min="0" value={policy.maxDays} onChange={(e) => setPolicy({ ...policy, maxDays: Number(e.target.value) })} className="w-full rounded-md border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-pink-400" />
            <span className="text-xs text-gray-500">Dias desde la venta en que se permite devolver. 0 = sin limite.</span>
          </label>
          <label className="flex cursor-pointer items-start gap-3 rounded-md border border-gray-200 px-3 py-3">
            <input type="checkbox" checked={policy.requireApproval} onChange={(e) => setPolicy({ ...policy, requireApproval: e.target.checked })} className="mt-0.5 h-4 w-4 accent-rose-600" />
            <span>
              <span className="block text-sm font-semibold text-gray-700">Requiere aprobacion del admin</span>
              <span className="block text-xs text-gray-500">Las devoluciones quedan pendientes hasta que un admin las apruebe.</span>
            </span>
          </label>
        </div>
        <button type="submit" className="mt-6 inline-flex items-center gap-2 rounded-md bg-rose-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-rose-700">
          <Save className="h-4 w-4" /> {policySaved ? "Guardado" : "Guardar politica"}
        </button>
      </form>
      </div>

      {/* Usuarios y roles */}
      <div id="usuarios" className="scroll-mt-6 rounded-lg bg-white shadow-sm ring-1 ring-gray-100">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 p-6">
          <div className="flex items-center gap-3">
            <div className="rounded-md bg-indigo-100 p-3"><Users className="h-5 w-5 text-indigo-600" /></div>
            <div>
              <h2 className="font-bold text-gray-900">Usuarios y roles</h2>
              <p className="text-sm text-gray-500">Crea, edita vendedores y restablece contrasenas.</p>
            </div>
          </div>
          <button onClick={() => { setShowCreate(true); setError(""); }} className="inline-flex items-center gap-2 rounded-md bg-indigo-600 px-4 py-2 text-sm font-bold text-white hover:bg-indigo-700">
            <UserPlus className="h-4 w-4" /> Nuevo usuario
          </button>
        </div>

        {usersLoading ? (
          <div className="px-6 py-10 text-center text-sm text-gray-400">Cargando usuarios...</div>
        ) : users.length === 0 ? (
          <div className="px-6 py-10 text-center text-sm text-gray-400">No hay usuarios registrados.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-indigo-50 text-indigo-700">
                <tr>
                  <th className="px-5 py-3 text-left font-medium">Usuario</th>
                  <th className="px-5 py-3 text-left font-medium">Correo</th>
                  <th className="px-5 py-3 text-left font-medium">Rol</th>
                  <th className="px-5 py-3 text-left font-medium">Estado</th>
                  <th className="px-5 py-3 text-center font-medium">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {users.map((u) => (
                  <tr key={u.id} className="transition-colors hover:bg-indigo-50/40">
                    <td className="px-5 py-3 font-semibold text-gray-800">{u.name} {u.lastName}</td>
                    <td className="px-5 py-3 text-gray-500">{u.email}</td>
                    <td className="px-5 py-3">
                      <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${u.role === "ADMIN" ? "bg-purple-100 text-purple-700" : "bg-gray-100 text-gray-600"}`}>
                        {u.role === "ADMIN" && <Shield className="h-3 w-3" />}
                        {u.role === "ADMIN" ? "Admin" : "Vendedor"}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${u.isActive ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-600"}`}>
                        {u.isActive ? "Activo" : "Inactivo"}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center justify-center gap-1">
                        <button onClick={() => openEdit(u)} className="rounded-md p-2 text-gray-400 hover:bg-indigo-50 hover:text-indigo-600" title="Editar"><Pencil className="h-4 w-4" /></button>
                        <button onClick={() => { setResetTarget(u); setResetPwd(""); setError(""); }} className="rounded-md p-2 text-gray-400 hover:bg-amber-50 hover:text-amber-600" title="Restablecer contrasena"><KeyRound className="h-4 w-4" /></button>
                        <button
                          onClick={() => toggleActive(u)}
                          disabled={u.email === currentEmail}
                          className="rounded-md px-2 py-1 text-xs font-semibold text-gray-500 hover:bg-gray-100 disabled:opacity-40"
                          title={u.email === currentEmail ? "No puedes desactivar tu propio usuario" : ""}
                        >
                          {u.isActive ? "Desactivar" : "Activar"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal crear usuario */}
      {showCreate && (
        <Modal title="Nuevo usuario" onClose={() => setShowCreate(false)}>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Nombre"><input value={createForm.name} onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })} className="field" /></Field>
              <Field label="Apellido"><input value={createForm.lastName} onChange={(e) => setCreateForm({ ...createForm, lastName: e.target.value })} className="field" /></Field>
            </div>
            <Field label="Correo"><input type="email" value={createForm.email} onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })} className="field" /></Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Contrasena (min. 6)"><input type="text" value={createForm.password} onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })} className="field" /></Field>
              <Field label="Rol">
                <select value={createForm.role} onChange={(e) => setCreateForm({ ...createForm, role: e.target.value as "ADMIN" | "USER" })} className="field bg-white">
                  <option value="USER">Vendedor</option>
                  <option value="ADMIN">Admin</option>
                </select>
              </Field>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setShowCreate(false)} className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50">Cancelar</button>
              <button type="submit" disabled={creating} className="rounded-lg bg-indigo-600 px-5 py-2 text-sm font-bold text-white hover:bg-indigo-700 disabled:opacity-60">{creating ? "Creando..." : "Crear usuario"}</button>
            </div>
          </form>
        </Modal>
      )}

      {/* Modal editar usuario */}
      {editUser && (
        <Modal title={`Editar ${editUser.name}`} onClose={() => setEditUser(null)}>
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Nombre"><input value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} className="field" /></Field>
              <Field label="Apellido"><input value={editForm.lastName} onChange={(e) => setEditForm({ ...editForm, lastName: e.target.value })} className="field" /></Field>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Rol">
                <select value={editForm.role} onChange={(e) => setEditForm({ ...editForm, role: e.target.value as "ADMIN" | "USER" })} className="field bg-white">
                  <option value="USER">Vendedor</option>
                  <option value="ADMIN">Admin</option>
                </select>
              </Field>
              <Field label="Estado">
                <select value={editForm.isActive ? "1" : "0"} onChange={(e) => setEditForm({ ...editForm, isActive: e.target.value === "1" })} className="field bg-white">
                  <option value="1">Activo</option>
                  <option value="0">Inactivo</option>
                </select>
              </Field>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setEditUser(null)} className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50">Cancelar</button>
              <button onClick={handleEditSave} disabled={savingEdit} className="rounded-lg bg-indigo-600 px-5 py-2 text-sm font-bold text-white hover:bg-indigo-700 disabled:opacity-60">{savingEdit ? "Guardando..." : "Guardar"}</button>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal reset contrasena */}
      {resetTarget && (
        <Modal title={`Restablecer contrasena`} onClose={() => setResetTarget(null)}>
          <div className="space-y-4">
            <p className="text-sm text-gray-500">Define una nueva contrasena para <span className="font-semibold text-gray-700">{resetTarget.name} {resetTarget.lastName}</span>.</p>
            <Field label="Nueva contrasena (min. 6)"><input type="text" value={resetPwd} onChange={(e) => setResetPwd(e.target.value)} className="field" /></Field>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setResetTarget(null)} className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50">Cancelar</button>
              <button onClick={handleReset} disabled={resetting} className="inline-flex items-center gap-2 rounded-lg bg-amber-600 px-5 py-2 text-sm font-bold text-white hover:bg-amber-700 disabled:opacity-60"><KeyRound className="h-4 w-4" />{resetting ? "Guardando..." : "Actualizar"}</button>
            </div>
          </div>
        </Modal>
      )}

      <style jsx>{`
        .field { width:100%; border-radius:0.375rem; border:1px solid rgb(229 231 235); padding:0.625rem 0.75rem; font-size:0.875rem; outline:none; }
        .field:focus { box-shadow:0 0 0 2px rgb(129 140 248); }
      `}</style>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="space-y-1.5">
      <span className="block text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</span>
      {children}
    </label>
  );
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <h3 className="font-bold text-gray-900">{title}</h3>
          <button onClick={onClose} className="rounded-md p-1 text-gray-400 hover:bg-gray-100"><X className="h-5 w-5" /></button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}
