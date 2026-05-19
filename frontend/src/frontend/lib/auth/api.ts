import { LoginCredentials } from "./types";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:3001";

export const loginUser = async (credentials: LoginCredentials) => {
  return fetch(`${BACKEND_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(credentials),
  });
};

export const forgotPassword = async (email: string) => {
  return fetch(`${BACKEND_URL}/api/auth/forgot-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });
};

export const resetPassword = async (data: {
  email: string;
  tempPassword: string;
  newPassword: string;
  confirmPassword: string;
}) => {
  return fetch(`${BACKEND_URL}/api/auth/reset-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
};
