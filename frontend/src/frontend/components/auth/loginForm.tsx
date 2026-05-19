"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { loginUser } from "@/frontend/lib/auth/api";
import { LoginCredentials, ValidationErrors } from "@/frontend/lib/auth/types";
import { validateLoginForm } from "@/frontend/lib/auth/validation";

export const LoginForm = () => {
  const [credentials, setCredentials] = useState<LoginCredentials>({ email: "", password: "" });
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setCredentials((prev) => ({ ...prev, [name]: value }));
    if (errors[name as keyof ValidationErrors]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrors({});

    const validationErrors = validateLoginForm(credentials);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setIsLoading(true);
    try {
      const result = await loginUser(credentials);
      if (result.ok) {
        const data = await result.json();
        localStorage.setItem("top-modas-user", JSON.stringify(data.user));
        router.push(data.user.role === "ADMIN" ? "/dashboard" : "/dashboard/caja");
      } else {
        const data = await result.json();
        setErrors({ general: data.error ?? "Credenciales inválidas. Por favor, intenta de nuevo." });
      }
    } catch {
      setErrors({ general: "Ocurrió un error inesperado. Por favor, intenta de nuevo." });
    } finally {
      setIsLoading(false);
    }
  };



  return (
    <>
      <form className="space-y-5" onSubmit={handleSubmit} noValidate>
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
            Correo electrónico:
          </label>
          <input
            type="email"
            id="email"
            name="email"
            value={credentials.email}
            onChange={handleChange}
            placeholder="correo@ejemplo.com"
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-pink-500 transition-colors ${
              errors.email ? "border-red-400 bg-red-50" : "border-gray-300"
            }`}
            disabled={isLoading}
          />
          {errors.email && <p className="mt-1 text-xs text-red-500">{errors.email}</p>}
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
            Contraseña:
          </label>
          <input
            type="password"
            id="password"
            name="password"
            value={credentials.password}
            onChange={handleChange}
            placeholder="••••••••"
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-pink-500 transition-colors ${
              errors.password ? "border-red-400 bg-red-50" : "border-gray-300"
            }`}
            disabled={isLoading}
          />
          {errors.password && <p className="mt-1 text-xs text-red-500">{errors.password}</p>}
        </div>

        {errors.general && (
          <div className="text-sm text-red-500 text-center bg-red-50 border border-red-200 rounded-md py-2 px-3">
            {errors.general}
          </div>
        )}

        <button
          type="submit"
          disabled={isLoading}
          className="w-full bg-gradient-to-r from-pink-400 to-pink-600 text-white py-2.5 rounded-md hover:from-pink-500 hover:to-pink-700 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:ring-offset-2 font-medium disabled:opacity-60"
        >
          {isLoading ? "Iniciando sesión..." : "Iniciar Sesión"}
        </button>
      </form>

      <div className="mt-5 text-center text-sm space-y-2">
        <p className="text-gray-500">¿Necesitas ayuda?</p>
        <a
          href="/forgot-password"
          className="text-pink-600 hover:underline block"
        >
          ¿Olvidaste tu contraseña?
        </a>
        <a href="/contact-admin" className="text-pink-600 hover:underline block">
          Contactar al Administrador
        </a>
      </div>
    </>
  );
};
