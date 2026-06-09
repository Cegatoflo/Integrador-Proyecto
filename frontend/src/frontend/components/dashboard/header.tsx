"use client";

import { Bell, User, Menu, AlertTriangle, XCircle, X, Clock, CheckCircle } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { getProducts, getStockRequests, updateStockRequestStatus, type Product, type StockRequest, type StockRequestStatus } from "@/frontend/lib/dashboard/api";

interface HeaderProps {
  toggleSidebar?: () => void;
}

type StockAlert = {
  product: Product;
  level: "low" | "critical" | "out";
};

const alertStyles = {
  out: { bg: "bg-red-50", text: "text-red-700", badge: "bg-red-100 text-red-700", icon: XCircle, label: "Agotado" },
  critical: { bg: "bg-orange-50", text: "text-orange-700", badge: "bg-orange-100 text-orange-700", icon: AlertTriangle, label: "Crítico" },
  low: { bg: "bg-yellow-50", text: "text-yellow-700", badge: "bg-yellow-100 text-yellow-700", icon: AlertTriangle, label: "Stock bajo" },
};

const requestStatusStyle = {
  PENDING: { bg: "bg-blue-50", badge: "bg-blue-100 text-blue-700", icon: Clock, label: "Pendiente" },
  APPROVED: { bg: "bg-emerald-50", badge: "bg-emerald-100 text-emerald-700", icon: CheckCircle, label: "Aprobada" },
  REJECTED: { bg: "bg-red-50", badge: "bg-red-100 text-red-700", icon: XCircle, label: "Rechazada" },
};

export default function Header({ toggleSidebar }: HeaderProps) {
  const [isAdmin, setIsAdmin] = useState(false);
  const [userName, setUserName] = useState("");
  const [stockAlerts, setStockAlerts] = useState<StockAlert[]>([]);
  const [pendingRequests, setPendingRequests] = useState<StockRequest[]>([]);
  const [myRequests, setMyRequests] = useState<StockRequest[]>([]);
  const [open, setOpen] = useState(false);
  const [dropdownPos, setDropdownPos] = useState({ top: 0, right: 0 });
  const bellRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      const user = JSON.parse(localStorage.getItem("top-modas-user") || "{}") as { role?: string; name?: string; email?: string };
      const admin = user.role === "ADMIN";
      setIsAdmin(admin);
      setUserName(user.name || user.email || "");

      if (admin) {
        const lowLimit = parseInt(localStorage.getItem("lowStockLimit") || "10", 10);
        const criticalLimit = parseInt(localStorage.getItem("criticalStockLimit") || "3", 10);

        Promise.all([getProducts(), getStockRequests()]).then(([products, requests]) => {
          const alerts: StockAlert[] = products
            .filter((p) => p.stock <= lowLimit)
            .map((p) => ({
              product: p,
              level: p.stock === 0 ? "out" : p.stock <= criticalLimit ? "critical" : "low",
            }))
            .sort((a, b) => a.product.stock - b.product.stock);
          setStockAlerts(alerts);
          setPendingRequests(requests.filter((r) => r.status === "PENDING"));
        }).catch(() => {});
      } else {
        const name = user.name || user.email || "";
        if (name) {
          getStockRequests(name).then(setMyRequests).catch(() => {});
        }
      }
    } catch {
      // not logged in
    }
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const badgeCount = isAdmin
    ? stockAlerts.length + pendingRequests.length
    : myRequests.filter((r) => r.status === "PENDING").length;

  return (
    <header className="relative bg-white shadow-sm" ref={dropdownRef}>
      <div className="flex items-center justify-between px-6 py-4">
        <div className="flex items-center">
          <button onClick={toggleSidebar} className="mr-4 md:hidden">
            <Menu className="h-6 w-6 text-gray-600" />
          </button>
        </div>
        <div className="flex items-center gap-4">
          <button
            ref={bellRef}
            onClick={() => {
              if (bellRef.current) {
                const rect = bellRef.current.getBoundingClientRect();
                setDropdownPos({
                  top: rect.bottom + 8,
                  right: window.innerWidth - rect.right,
                });
              }
              setOpen((v) => !v);
            }}
            className="relative p-2 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <Bell className="h-5 w-5" />
            {badgeCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                {badgeCount > 99 ? "99+" : badgeCount}
              </span>
            )}
          </button>

          <button className="p-2 text-gray-400 hover:text-gray-600 transition-colors">
            <User className="h-5 w-5" />
          </button>
        </div>
      </div>

      {open && (
        <div
          className="fixed z-50 w-72 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl"
          style={{ top: dropdownPos.top, right: dropdownPos.right }}
        >
          <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
            <span className="text-sm font-semibold text-gray-800">
              {isAdmin ? "Notificaciones" : "Mis solicitudes"}
            </span>
            <button onClick={() => setOpen(false)}>
              <X className="h-4 w-4 text-gray-400 hover:text-gray-600" />
            </button>
          </div>

          {isAdmin ? (
            <AdminNotifications
              alerts={stockAlerts}
              requests={pendingRequests}
              onRequestUpdated={(id, status) => {
                setPendingRequests((prev) => prev.filter((r) => r.id !== id));
                if (status === "APPROVED") {
                  updateStockRequestStatus(id, "APPROVED").catch(() => {});
                } else {
                  updateStockRequestStatus(id, "REJECTED").catch(() => {});
                }
              }}
            />
          ) : (
            <UserNotifications requests={myRequests} userName={userName} />
          )}
        </div>
      )}
    </header>
  );
}

function AdminNotifications({
  alerts,
  requests,
  onRequestUpdated,
}: {
  alerts: StockAlert[];
  requests: StockRequest[];
  onRequestUpdated: (id: string, status: StockRequestStatus) => void;
}) {
  const empty = alerts.length === 0 && requests.length === 0;

  if (empty) {
    return (
      <div className="px-4 py-6 text-center text-sm text-gray-400">
        Sin notificaciones pendientes
      </div>
    );
  }

  return (
    <ul className="max-h-96 overflow-y-auto divide-y divide-gray-50">
      {requests.length > 0 && (
        <li className="bg-blue-50 px-4 py-2">
          <p className="truncate text-[11px] font-bold uppercase tracking-wide text-blue-600">
            Solicitudes ({requests.length})
          </p>
        </li>
      )}
      {requests.map((req) => (
        <li key={req.id} className="bg-blue-50/60 px-4 py-3">
          <div className="flex items-start gap-2 mb-2">
            <Clock className="mt-0.5 h-4 w-4 flex-shrink-0 text-blue-500" />
            <div className="flex-1 min-w-0">
              <p className="truncate text-sm font-medium text-gray-800">{req.product.name}</p>
              <p className="text-xs text-gray-400">Por: {req.requestedBy} · +{req.quantityRequested} uds.</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => onRequestUpdated(req.id, "APPROVED")}
              className="flex-1 rounded-md bg-emerald-500 py-1 text-xs font-semibold text-white hover:bg-emerald-600"
            >
              Aprobar
            </button>
            <button
              onClick={() => onRequestUpdated(req.id, "REJECTED")}
              className="flex-1 rounded-md bg-red-100 py-1 text-xs font-semibold text-red-600 hover:bg-red-200"
            >
              Rechazar
            </button>
          </div>
        </li>
      ))}

      {alerts.length > 0 && (
        <li className="bg-gray-50 px-4 py-2">
          <p className="truncate text-[11px] font-bold uppercase tracking-wide text-gray-500">
            Stock bajo ({alerts.length})
          </p>
        </li>
      )}
      {alerts.map(({ product, level }) => {
        const style = alertStyles[level];
        const Icon = style.icon;
        return (
          <li key={product.id} className={`flex items-start gap-3 px-4 py-3 ${style.bg}`}>
            <Icon className={`mt-0.5 h-4 w-4 flex-shrink-0 ${style.text}`} />
            <div className="flex-1 min-w-0">
              <p className="truncate text-sm font-medium text-gray-800">{product.name}</p>
              {product.sku && <p className="text-xs text-gray-400">{product.sku}</p>}
            </div>
            <div className="flex flex-col items-end gap-1 flex-shrink-0">
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${style.badge}`}>
                {style.label}
              </span>
              <span className="text-xs font-bold text-gray-600">{product.stock} uds.</span>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function UserNotifications({ requests, userName }: { requests: StockRequest[]; userName: string }) {
  if (requests.length === 0) {
    return (
      <div className="px-4 py-6 text-center text-sm text-gray-400">
        {userName ? "No tienes solicitudes enviadas" : "Cargando..."}
      </div>
    );
  }

  return (
    <ul className="max-h-80 overflow-y-auto divide-y divide-gray-50">
      {requests.map((req) => {
        const style = requestStatusStyle[req.status];
        const Icon = style.icon;
        return (
          <li key={req.id} className={`flex items-start gap-3 px-4 py-3 ${style.bg}`}>
            <Icon className="mt-0.5 h-4 w-4 flex-shrink-0 text-gray-500" />
            <div className="flex-1 min-w-0">
              <p className="truncate text-sm font-medium text-gray-800">{req.product.name}</p>
              <p className="text-xs text-gray-400">
                {new Date(req.createdAt).toLocaleDateString("es-PE", { day: "2-digit", month: "short" })}
              </p>
            </div>
            <div className="flex flex-col items-end gap-1 flex-shrink-0">
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${style.badge}`}>
                {style.label}
              </span>
              <span className="text-xs font-bold text-gray-600">+{req.quantityRequested} uds.</span>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
