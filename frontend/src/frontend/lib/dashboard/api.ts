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

export type StockRequestStatus = "PENDING" | "APPROVED" | "REJECTED";

export type StockRequest = {
  id: string;
  productId: string;
  requestedBy: string;
  quantityRequested: number;
  status: StockRequestStatus;
  note: string | null;
  createdAt: string;
  updatedAt: string;
  product: { id: string; name: string; sku: string | null; stock: number };
};

export const getStockRequests = async (requestedBy?: string): Promise<StockRequest[]> => {
  const url = requestedBy
    ? `${BACKEND_URL}/api/stock-requests?requestedBy=${encodeURIComponent(requestedBy)}`
    : `${BACKEND_URL}/api/stock-requests`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("Error al obtener solicitudes");
  return res.json();
};

export const createStockRequest = async (payload: {
  productId: string;
  requestedBy: string;
  quantityRequested: number;
  note?: string;
}): Promise<StockRequest> => {
  const res = await fetch(`${BACKEND_URL}/api/stock-requests`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "Error al crear solicitud");
  return data;
};

export const updateStockRequestStatus = async (
  id: string,
  status: StockRequestStatus
): Promise<StockRequest> => {
  const res = await fetch(`${BACKEND_URL}/api/stock-requests/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "Error al actualizar solicitud");
  return data;
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

// ── Returns ──────────────────────────────────────────────────────────────────

export type ReturnStatus = "PENDING" | "APPROVED" | "REJECTED";

export type ProductReturn = {
  id: string;
  productId: string;
  saleId: string | null;
  quantity: number;
  reason: string;
  status: ReturnStatus;
  processedBy: string | null;
  createdAt: string;
  updatedAt: string;
  product: { id: string; name: string; sku: string | null; stock: number };
};

export const getReturns = async (): Promise<ProductReturn[]> => {
  const res = await fetch(`${BACKEND_URL}/api/returns`);
  if (!res.ok) throw new Error("Error al obtener devoluciones");
  return res.json();
};

export const createReturn = async (payload: {
  productId: string;
  quantity: number;
  reason: string;
  saleId?: string;
}): Promise<ProductReturn> => {
  const res = await fetch(`${BACKEND_URL}/api/returns`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "Error al crear devolución");
  return data;
};

export const updateReturnStatus = async (
  id: string,
  status: ReturnStatus,
  processedBy?: string
): Promise<ProductReturn> => {
  const res = await fetch(`${BACKEND_URL}/api/returns/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status, processedBy }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "Error al actualizar devolución");
  return data;
};

// ── Promotions ────────────────────────────────────────────────────────────────

export type DiscountType = "PERCENTAGE" | "FIXED";

export type Promotion = {
  id: string;
  name: string;
  description: string | null;
  discountType: DiscountType;
  discountValue: number;
  productId: string | null;
  startDate: string;
  endDate: string;
  isActive: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  product: { id: string; name: string; sku: string | null; stock: number; price: number } | null;
};

export const getPromotions = async (): Promise<Promotion[]> => {
  const res = await fetch(`${BACKEND_URL}/api/promotions`);
  if (!res.ok) throw new Error("Error al obtener promociones");
  return res.json();
};

export const createPromotion = async (payload: {
  name: string;
  description?: string;
  discountType: DiscountType;
  discountValue: number;
  productId?: string;
  startDate: string;
  endDate: string;
  createdBy: string;
}): Promise<Promotion> => {
  const res = await fetch(`${BACKEND_URL}/api/promotions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "Error al crear promoción");
  return data;
};

export const togglePromotion = async (id: string, isActive: boolean): Promise<Promotion> => {
  const res = await fetch(`${BACKEND_URL}/api/promotions/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ isActive }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "Error al actualizar promoción");
  return data;
};

export const deletePromotion = async (id: string): Promise<void> => {
  const res = await fetch(`${BACKEND_URL}/api/promotions/${id}`, { method: "DELETE" });
  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error ?? "Error al eliminar promoción");
  }
};
