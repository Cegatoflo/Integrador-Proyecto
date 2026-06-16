"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { BarChart2, Home, LogOut, PlusCircle, RotateCcw, Settings, Store, Tag, Users, X } from "lucide-react";

const allNavItems = [
  { name: "Dashboard", href: "/dashboard", icon: Home, adminOnly: true },
  { name: "Caja", href: "/dashboard/caja", icon: Store, adminOnly: false },
  { name: "Clientes", href: "/dashboard/customers", icon: Users, adminOnly: false },
  { name: "Reportes", href: "/dashboard/reports", icon: BarChart2, adminOnly: true },
  { name: "Inventario", href: "/dashboard/add-product", icon: PlusCircle, adminOnly: false },
  { name: "Devoluciones", href: "/dashboard/returns", icon: RotateCcw, adminOnly: false },
  { name: "Promociones", href: "/dashboard/promotions", icon: Tag, adminOnly: true },
  { name: "Configuracion", href: "/dashboard/settings", icon: Settings, adminOnly: true },
];

export default function Sidebar({ onClose }: { onClose?: () => void }) {
  const pathname = usePathname();
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    try {
      const user = JSON.parse(localStorage.getItem("top-modas-user") || "{}") as { role?: string };
      setIsAdmin(user.role === "ADMIN");
    } catch {
      setIsAdmin(false);
    }
  }, []);

  const navItems = allNavItems.filter((item) => !item.adminOnly || isAdmin);

  return (
    <div className="flex w-64 flex-shrink-0 flex-col bg-white shadow-lg">
      <div className="flex h-20 items-center justify-between bg-gradient-to-r from-pink-50 to-white px-4 shadow-md">
        <h1 className="text-2xl font-bold text-pink-700">TOP MODAS</h1>
        {onClose && (
          <button onClick={onClose} className="rounded-md p-1 text-gray-400 hover:text-gray-600 md:hidden">
            <X className="h-5 w-5" />
          </button>
        )}
      </div>
      <nav className="flex-grow overflow-y-auto">
        <ul className="py-4">
          {navItems.map((item) => {
            const active = pathname === item.href || (item.href === "/dashboard/add-product" && pathname === "/dashboard/inventory");
            return (
              <li key={item.name}>
                <Link
                  href={item.href}
                  className={`flex items-center px-6 py-3 text-sm transition-colors ${
                    active
                      ? "border-r-4 border-pink-500 bg-pink-100 font-semibold text-pink-700"
                      : "text-gray-600 hover:bg-gray-50 hover:text-gray-800"
                  }`}
                >
                  <item.icon className="mr-3 h-5 w-5 flex-shrink-0" />
                  {item.name}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      <div className="border-t border-gray-100 p-4">
        <Link
          href="/"
          onClick={() => localStorage.removeItem("top-modas-user")}
          className="flex items-center rounded-lg px-4 py-2.5 text-sm text-gray-500 transition-colors hover:bg-red-50 hover:text-red-500"
        >
          <LogOut className="mr-3 h-5 w-5" />
          Cerrar sesion
        </Link>
      </div>
    </div>
  );
}
