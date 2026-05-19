"use client";

import React from "react";
import { DataTable } from "@/frontend/components/ui/dataTable";
import { Button } from "@/components/ui/button";
import { Edit, Trash } from "lucide-react";

interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  totalPurchases: number;
}

const columns = [
  {
    accessorKey: "name" as keyof Customer,
    header: "Nombre",
  },
  {
    accessorKey: "email" as keyof Customer,
    header: "Email",
  },
  {
    accessorKey: "phone" as keyof Customer,
    header: "Teléfono",
  },
  {
    accessorKey: "totalPurchases" as keyof Customer,
    header: "Total de Compras",
    cell: (item: Customer) => `$${item.totalPurchases.toFixed(2)}`,
  },
  {
    accessorKey: "id" as keyof Customer,
    header: "Acciones",
    cell: () => (
      <div className="flex gap-2">
        <Button variant="ghost" size="icon">
          <Edit className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon">
          <Trash className="h-4 w-4" />
        </Button>
      </div>
    ),
  },
];

// EJEMPlo de data (aun no hay nada en la base de datos)
const data: Customer[] = [
  {
    id: "1",
    name: "Juan Pérez",
    email: "juan@example.com",
    phone: "123-456-7890",
    totalPurchases: 1500,
  },
  {
    id: "2",
    name: "María García",
    email: "maria@example.com",
    phone: "987-654-3210",
    totalPurchases: 2300,
  },
  {
    id: "3",
    name: "Carlos Rodríguez",
    email: "carlos@example.com",
    phone: "456-789-0123",
    totalPurchases: 1800,
  },
];

export function CustomersTable() {
  return <DataTable columns={columns} data={data} />;
}
