"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState, FormEvent } from "react";
import { sendContact } from "@/frontend/lib/contact/api";

export default function ContactPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({ name: "", email: "", message: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.name.trim()) newErrors.name = "El nombre es requerido";
    if (!formData.email) newErrors.email = "El correo es requerido";
    else if (!/\S+@\S+\.\S+/.test(formData.email)) newErrors.email = "Correo inválido";
    if (!formData.message.trim()) newErrors.message = "El mensaje es requerido";
    return newErrors;
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setIsLoading(true);
    try {
      const result = await sendContact(formData);
      if (result.ok) {
        setIsSubmitted(true);
      } else {
        setErrors({ general: "No se pudo enviar el mensaje. Intenta de nuevo." });
      }
    } catch {
      setErrors({ general: "Ocurrió un error inesperado." });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      <div className="text-center mb-6">
        <Image src="/logo.svg" alt="Top Modas Logo" width={80} height={80} className="mx-auto mb-3" />
        <h1 className="text-2xl font-bold text-pink-900">Contacto</h1>
      </div>

      {!isSubmitted ? (
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
              Nombre:
            </label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="Tu nombre"
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-pink-500 ${
                errors.name ? "border-red-400 bg-red-50" : "border-gray-300"
              }`}
            />
            {errors.name && <p className="mt-1 text-xs text-red-500">{errors.name}</p>}
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Correo electrónico:
            </label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="correo@ejemplo.com"
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-pink-500 ${
                errors.email ? "border-red-400 bg-red-50" : "border-gray-300"
              }`}
            />
            {errors.email && <p className="mt-1 text-xs text-red-500">{errors.email}</p>}
          </div>

          <div>
            <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-1">
              Mensaje:
            </label>
            <textarea
              id="message"
              name="message"
              value={formData.message}
              onChange={handleChange}
              placeholder="Escribe tu mensaje aquí..."
              rows={4}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-pink-500 resize-none ${
                errors.message ? "border-red-400 bg-red-50" : "border-gray-300"
              }`}
            />
            {errors.message && <p className="mt-1 text-xs text-red-500">{errors.message}</p>}
          </div>

          {errors.general && (
            <div className="text-sm text-red-500 text-center bg-red-50 border border-red-200 rounded-md py-2 px-3">
              {errors.general}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-gradient-to-r from-pink-400 to-pink-600 text-white py-2.5 rounded-md hover:from-pink-500 hover:to-pink-700 transition-all duration-300 font-medium disabled:opacity-60"
          >
            {isLoading ? "Enviando..." : "Enviar Mensaje"}
          </button>

          <div className="text-center">
            <button
              type="button"
              onClick={() => router.push("/")}
              className="text-pink-600 hover:underline text-sm"
            >
              Volver al inicio de sesión
            </button>
          </div>
        </form>
      ) : (
        <div className="text-center py-6">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <p className="text-green-600 font-semibold mb-2">
            El mensaje fue enviado con éxito
          </p>
          <p className="text-gray-500 text-sm mb-6">
            El administrador se pondrá en contacto contigo pronto.
          </p>
          <button
            onClick={() => router.push("/")}
            className="w-full bg-gradient-to-r from-pink-400 to-pink-600 text-white py-2.5 rounded-md hover:from-pink-500 hover:to-pink-700 transition-all font-medium"
          >
            Volver
          </button>
        </div>
      )}
    </div>
  );
}
