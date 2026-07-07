const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:3001";

export type ContactMessage = {
  id: string;
  name: string;
  email: string;
  message: string;
  read: boolean;
  createdAt: string;
};

export const sendContact = async (data: {
  name: string;
  email: string;
  message: string;
}) => {
  return fetch(`${BACKEND_URL}/api/contact`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
};

export const getContactMessages = async (unreadOnly = false): Promise<ContactMessage[]> => {
  const url = unreadOnly ? `${BACKEND_URL}/api/contact?unread=true` : `${BACKEND_URL}/api/contact`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("Error al obtener mensajes");
  return res.json();
};

export const markContactRead = async (id: string): Promise<void> => {
  const res = await fetch(`${BACKEND_URL}/api/contact/${id}/read`, { method: "PATCH" });
  if (!res.ok) throw new Error("Error al marcar mensaje");
};

export const deleteContactMessage = async (id: string): Promise<void> => {
  const res = await fetch(`${BACKEND_URL}/api/contact/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Error al eliminar mensaje");
};
