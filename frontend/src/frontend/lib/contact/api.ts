const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:3001";

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
