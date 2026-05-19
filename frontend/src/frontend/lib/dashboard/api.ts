const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:3001";

export type DashboardStats = {
  totalProducts: number;
  outOfStock: number;
  totalSales: number;
  recentProducts: Product[];
};

export type Product = {
  id: string;
  name: string;
  category: string;
  price: number;
  stock: number;
  sku?: string | null;
  size?: string | null;
  color?: string | null;
  brand?: string | null;
  referencePrice?: number | null;
  description?: string | null;
  createdAt: string;
  updatedAt: string;
};

export const getDashboardStats = async (): Promise<DashboardStats> => {
  const res = await fetch(`${BACKEND_URL}/api/dashboard/stats`);
  if (!res.ok) throw new Error("Error al obtener estadísticas");
  return res.json();
};

export const getProducts = async (): Promise<Product[]> => {
  const res = await fetch(`${BACKEND_URL}/api/products`);
  if (!res.ok) throw new Error("Error al obtener productos");
  return res.json();
};

export type SalePayload = {
  items: { productId: string; quantity: number; price: number }[];
  customerName?: string;
  customerDni?: string;
  customerEmail?: string;
  paymentMethod?: string;
  paymentStatus?: string;
  transactionReference?: string;
  amountPaid?: number;
  changeAmount?: number;
};

export const processSale = async (payload: SalePayload) => {
  const res = await fetch(`${BACKEND_URL}/api/sales`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "Error al procesar venta");
  return data;
};
