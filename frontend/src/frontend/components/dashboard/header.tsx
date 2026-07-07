"use client";

import { Bell, AlertTriangle, XCircle, X, Clock, CheckCircle, RotateCcw, ArrowRight, Mail, Check } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import {
  getProducts,
  getStockRequests,
  getReturns,
  type Product,
  type StockRequest,
  type ProductReturn,
} from "@/frontend/lib/dashboard/api";
import { getContactMessages, markContactRead, type ContactMessage } from "@/frontend/lib/contact/api";

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

export default function Header() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [userName, setUserName] = useState("");
  const [stockAlerts, setStockAlerts] = useState<StockAlert[]>([]);
  const [pendingRequests, setPendingRequests] = useState<StockRequest[]>([]);
  const [pendingReturns, setPendingReturns] = useState<ProductReturn[]>([]);
  const [contactMessages, setContactMessages] = useState<ContactMessage[]>([]);
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

        Promise.all([getProducts(), getStockRequests(), getReturns(), getContactMessages(true)]).then(([products, requests, returns, messages]) => {
          const alerts: StockAlert[] = products
            .filter((p) => p.stock <= lowLimit)
            .map((p) => ({
              product: p,
              level: (p.stock === 0 ? "out" : p.stock <= criticalLimit ? "critical" : "low") as StockAlert["level"],
            }))
            .sort((a, b) => a.product.stock - b.product.stock);
          setStockAlerts(alerts);
          setPendingRequests(requests.filter((r) => r.status === "PENDING"));
          setPendingReturns(returns.filter((r) => r.status === "PENDING"));
          setContactMessages(messages);
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
    ? stockAlerts.length + pendingRequests.length + pendingReturns.length + contactMessages.length
    : myRequests.filter((r) => r.status === "PENDING").length;

  const handleReadMessage = async (id: string) => {
    setContactMessages((prev) => prev.filter((m) => m.id !== id));
    try {
      await markContactRead(id);
    } catch {
      // si falla, se recupera al recargar
    }
  };

  return (
    <header className="relative bg-white shadow-sm" ref={dropdownRef}>
      <div className="flex h-20 items-center justify-end px-6">
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
          <Bell className="h-6 w-6" />
          {badgeCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[11px] font-bold text-white">
              {badgeCount > 99 ? "99+" : badgeCount}
            </span>
          )}
        </button>
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
              returns={pendingReturns}
              messages={contactMessages}
              onRead={handleReadMessage}
              onNavigate={() => setOpen(false)}
            />
          ) : (
            <>
              <UserNotifications requests={myRequests} userName={userName} />
              <a
                href="/dashboard/add-product"
                onClick={() => setOpen(false)}
                className="flex items-center justify-center gap-1.5 border-t border-gray-100 bg-gray-50 px-4 py-3 text-sm font-semibold text-pink-600 hover:bg-pink-50"
              >
                Ir a inventario
                <ArrowRight className="h-4 w-4" />
              </a>
            </>
          )}
        </div>
      )}
    </header>
  );
}

function SectionHeader({ label, count, href, onNavigate, accent }: { label: string; count: number; href: string; onNavigate: () => void; accent: string }) {
  return (
    <li className="flex items-center justify-between bg-gray-50 px-4 py-2">
      <p className={`truncate text-[11px] font-bold uppercase tracking-wide ${accent}`}>
        {label} ({count})
      </p>
      <a href={href} onClick={onNavigate} className="flex items-center gap-0.5 text-[11px] font-semibold text-pink-600 hover:underline">
        Ver <ArrowRight className="h-3 w-3" />
      </a>
    </li>
  );
}

function AdminNotifications({
  alerts,
  requests,
  returns,
  messages,
  onRead,
  onNavigate,
}: {
  alerts: StockAlert[];
  requests: StockRequest[];
  returns: ProductReturn[];
  messages: ContactMessage[];
  onRead: (id: string) => void;
  onNavigate: () => void;
}) {
  const empty = alerts.length === 0 && requests.length === 0 && returns.length === 0 && messages.length === 0;

  if (empty) {
    return <div className="px-4 py-6 text-center text-sm text-gray-400">Sin notificaciones pendientes</div>;
  }

  return (
    <ul className="max-h-96 overflow-y-auto divide-y divide-gray-50">
      {messages.length > 0 && (
        <>
          <SectionHeader label="Mensajes de contacto" count={messages.length} href="/dashboard/settings#mensajes" onNavigate={onNavigate} accent="text-pink-600" />
          {messages.map((msg) => (
            <li key={msg.id} className="flex items-start gap-2 bg-pink-50/60 px-4 py-3">
              <a href="/dashboard/settings#mensajes" onClick={onNavigate} className="flex min-w-0 flex-1 items-start gap-3">
                <Mail className="mt-0.5 h-4 w-4 flex-shrink-0 text-pink-500" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-gray-800">{msg.name}</p>
                  <p className="truncate text-xs text-gray-500">{msg.message}</p>
                  <p className="truncate text-[11px] text-gray-400">{msg.email}</p>
                </div>
              </a>
              <button
                onClick={() => onRead(msg.id)}
                title="Marcar como leído"
                className="flex-shrink-0 self-center rounded-full p-1 text-pink-600 hover:bg-pink-100"
              >
                <Check className="h-4 w-4" />
              </button>
            </li>
          ))}
        </>
      )}

      {requests.length > 0 && (
        <>
          <SectionHeader label="Solicitudes de stock" count={requests.length} href="/dashboard/add-product#solicitudes" onNavigate={onNavigate} accent="text-blue-600" />
          {requests.map((req) => (
            <li key={req.id} className="flex items-start gap-3 bg-blue-50/60 px-4 py-3">
              <Clock className="mt-0.5 h-4 w-4 flex-shrink-0 text-blue-500" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-gray-800">{req.product.name}</p>
                <p className="text-xs text-gray-400">Por: {req.requestedBy} · +{req.quantityRequested} uds.</p>
              </div>
              <span className="flex-shrink-0 rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-semibold text-blue-700">Pendiente</span>
            </li>
          ))}
        </>
      )}

      {returns.length > 0 && (
        <>
          <SectionHeader label="Devoluciones" count={returns.length} href="/dashboard/returns" onNavigate={onNavigate} accent="text-purple-600" />
          {returns.map((ret) => (
            <li key={ret.id} className="flex items-start gap-3 bg-purple-50/60 px-4 py-3">
              <RotateCcw className="mt-0.5 h-4 w-4 flex-shrink-0 text-purple-500" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-gray-800">{ret.product.name}</p>
                <p className="truncate text-xs text-gray-400">{ret.quantity} uds. · {ret.reason}</p>
              </div>
              <span className="flex-shrink-0 rounded-full bg-purple-100 px-2 py-0.5 text-[10px] font-semibold text-purple-700">Pendiente</span>
            </li>
          ))}
        </>
      )}

      {alerts.length > 0 && (
        <>
          <SectionHeader label="Stock bajo" count={alerts.length} href="/dashboard/add-product" onNavigate={onNavigate} accent="text-gray-500" />
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
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${style.badge}`}>{style.label}</span>
                  <span className="text-xs font-bold text-gray-600">{product.stock} uds.</span>
                </div>
              </li>
            );
          })}
        </>
      )}
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
