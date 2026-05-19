"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart2, Home, LogOut, PlusCircle, Settings, Store, Users } from "lucide-react";

const navItems = [
  { name: "Dashboard", href: "/dashboard", icon: Home },
  { name: "Caja", href: "/dashboard/caja", icon: Store },
  { name: "Clientes", href: "/dashboard/customers", icon: Users },
  { name: "Reportes", href: "/dashboard/reports", icon: BarChart2 },
  { name: "Añadir Producto", href: "/dashboard/add-product", icon: PlusCircle },
  { name: "Configuracion", href: "/dashboard/settings", icon: Settings },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <div className="flex w-64 flex-shrink-0 flex-col bg-white shadow-lg">
      <div className="flex h-20 items-center justify-center bg-gradient-to-r from-pink-50 to-white shadow-md">
        <h1 className="text-2xl font-bold text-pink-700">TOP MODAS</h1>
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
