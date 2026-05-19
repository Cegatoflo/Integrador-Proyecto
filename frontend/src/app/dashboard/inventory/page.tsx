"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function InventoryRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/dashboard/add-product");
  }, [router]);

  return (
    <div className="py-10 text-center text-sm text-gray-500">
      Abriendo Añadir Producto...
    </div>
  );
}
