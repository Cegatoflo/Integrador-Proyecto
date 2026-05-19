"use client";

import React, { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { ArrowUpDown } from "lucide-react";

type Report = {
  id: string;
  date: string;
  user: string;
  action: string;
  details: string;
};

// Ejemplo porque no hay aun data en la db
const initialData: Report[] = [
  {
    id: "1",
    date: "2024-03-20",
    user: "Carlos Ruiz",
    action: "Venta",
    details: "Venta de 3 productos por $150",
  },
  {
    id: "2",
    date: "2024-03-21",
    user: "Ana López",
    action: "Devolución",
    details: "Devolución de 1 producto por $50",
  },
  {
    id: "3",
    date: "2024-03-22",
    user: "Miguel Torres",
    action: "Inventario",
    details: "Actualización de stock: +20 unidades",
  },
];

export function ReportsTable() {
  const [data, setData] = useState<Report[]>(initialData);
  const [sortColumn, setSortColumn] = useState<keyof Report | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  const handleSort = (column: keyof Report) => {
    if (column === sortColumn) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortColumn(column);
      setSortDirection("asc");
    }

    const sortedData = [...data].sort((a, b) => {
      if (a[column] < b[column]) return sortDirection === "asc" ? -1 : 1;
      if (a[column] > b[column]) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });

    setData(sortedData);
  };

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            {["date", "user", "action", "details"].map((column) => (
              <TableHead key={column}>
                <Button
                  variant="ghost"
                  onClick={() => handleSort(column as keyof Report)}
                  className="font-bold"
                >
                  {column.charAt(0).toUpperCase() + column.slice(1)}
                  <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((report) => (
            <TableRow key={report.id}>
              <TableCell>{report.date}</TableCell>
              <TableCell>{report.user}</TableCell>
              <TableCell>{report.action}</TableCell>
              <TableCell>{report.details}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
