const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:3001";

export type Customer = {
  id: string;
  name: string;
  dni: string;
  email: string | null;
  phone: string | null;
  createdAt: string;
};

export const getCustomers = async (): Promise<Customer[]> => {
  const res = await fetch(`${BACKEND_URL}/api/customers`);
  if (!res.ok) throw new Error("Error al obtener clientes");
  return res.json();
};

export const createCustomer = async (payload: {
  name: string;
  dni: string;
  email?: string;
  phone?: string;
}): Promise<Customer> => {
  const res = await fetch(`${BACKEND_URL}/api/customers`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "Error al crear cliente");
  return data;
};

export const updateCustomer = async (
  id: string,
  payload: { name?: string; email?: string; phone?: string }
): Promise<Customer> => {
  const res = await fetch(`${BACKEND_URL}/api/customers/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "Error al actualizar cliente");
  return data;
};

export const deleteCustomer = async (id: string): Promise<void> => {
  const res = await fetch(`${BACKEND_URL}/api/customers/${id}`, { method: "DELETE" });
  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error ?? "Error al eliminar cliente");
  }
};
