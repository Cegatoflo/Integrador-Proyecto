"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, Save, SlidersHorizontal, TriangleAlert } from "lucide-react";

const INVENTORY_SETTINGS_KEY = "top-modas-inventory-settings";

type InventorySettings = {
  lowStockLimit: number;
  criticalStockLimit: number;
};

const defaultSettings: InventorySettings = {
  lowStockLimit: 10,
  criticalStockLimit: 3,
};

export default function SettingsPage() {
  const [settings, setSettings] = useState<InventorySettings>(defaultSettings);
  const [saved, setSaved] = useState(false);
  const [role, setRole] = useState<"ADMIN" | "USER" | null>(null);

  useEffect(() => {
    try {
      const user = JSON.parse(localStorage.getItem("top-modas-user") || "{}") as { role?: "ADMIN" | "USER" };
      setRole(user.role === "ADMIN" ? "ADMIN" : "USER");
    } catch {
      setRole("USER");
    }

    try {
      const stored = JSON.parse(localStorage.getItem(INVENTORY_SETTINGS_KEY) || "null") as InventorySettings | null;
      if (stored) setSettings({ ...defaultSettings, ...stored });
    } catch {
      setSettings(defaultSettings);
    }
  }, []);

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

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Configuracion</h1>
        <p className="text-sm text-gray-500">Define los parametros que usa inventario para marcar productos escasos.</p>
      </div>

      <form onSubmit={saveSettings} className="max-w-3xl rounded-lg bg-white p-6 shadow-sm ring-1 ring-gray-100">
        <div className="mb-5 flex items-center gap-3 border-b border-gray-100 pb-4">
          <div className="rounded-md bg-pink-100 p-3">
            <SlidersHorizontal className="h-5 w-5 text-pink-600" />
          </div>
          <div>
            <h2 className="font-bold text-gray-900">Alertas de inventario</h2>
            <p className="text-sm text-gray-500">Estos limites se aplican en inventario y dashboard.</p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="space-y-2">
            <span className="text-sm font-semibold text-gray-700">Stock bajo</span>
            <input
              type="number"
              min="1"
              value={settings.lowStockLimit}
              onChange={(event) => setSettings({ ...settings, lowStockLimit: Number(event.target.value) })}
              className="w-full rounded-md border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-pink-400"
            />
            <span className="text-xs text-gray-500">Desde este valor aparece como Bajo.</span>
          </label>

          <label className="space-y-2">
            <span className="text-sm font-semibold text-gray-700">Stock critico</span>
            <input
              type="number"
              min="0"
              value={settings.criticalStockLimit}
              onChange={(event) => setSettings({ ...settings, criticalStockLimit: Number(event.target.value) })}
              className="w-full rounded-md border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-pink-400"
            />
            <span className="text-xs text-gray-500">Desde este valor aparece como Critico.</span>
          </label>
        </div>

        {settings.criticalStockLimit > settings.lowStockLimit && (
          <div className="mt-4 flex items-center gap-2 rounded-md bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-700">
            <TriangleAlert className="h-4 w-4" />
            El stock critico no deberia ser mayor que el stock bajo.
          </div>
        )}

        <button
          type="submit"
          className="mt-6 inline-flex items-center gap-2 rounded-md bg-pink-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-pink-700"
        >
          <Save className="h-4 w-4" />
          {saved ? "Guardado" : "Guardar configuracion"}
        </button>
      </form>
    </div>
  );
}
