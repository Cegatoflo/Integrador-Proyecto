"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState, FormEvent } from "react";
import { forgotPassword, resetPassword } from "@/frontend/lib/auth/api";

export default function ForgotPasswordPage() {
  const router = useRouter();
  
  // Estado para el paso 1: Enviar correo
  const [step1Email, setStep1Email] = useState("");
  const [step1Error, setStep1Error] = useState("");
  const [step1Loading, setStep1Loading] = useState(false);
  
  // Estado para el paso 2: Restablecer con código temporal
  const [resetForm, setResetForm] = useState({
    email: "",
    tempPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [resetErrors, setResetErrors] = useState<Record<string, string>>({});
  const [resetLoading, setResetLoading] = useState(false);
  
  // Estado general
  const [step, setStep] = useState<1 | 2>(1); // 1: Enviar correo, 2: Restablecer
  const [isSuccess, setIsSuccess] = useState(false);

  // Paso 1: Enviar correo de recuperación
  const handleStep1Submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setStep1Error("");

    if (!step1Email) {
      setStep1Error("El correo electrónico es requerido");
      return;
    }
    if (!/\S+@\S+\.\S+/.test(step1Email)) {
      setStep1Error("El correo electrónico no es válido");
      return;
    }

    setStep1Loading(true);
    try {
      await forgotPassword(step1Email);
      setResetForm((prev) => ({ ...prev, email: step1Email }));
      setStep(2);
    } catch {
      setStep1Error("Ocurrió un error. Por favor, intenta de nuevo.");
    } finally {
      setStep1Loading(false);
    }
  };

  // Paso 2: Cambiar contraseña
  const handleResetChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setResetForm((prev) => ({ ...prev, [name]: value }));
    if (resetErrors[name]) setResetErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const validateReset = () => {
    const newErrors: Record<string, string> = {};
    if (!resetForm.tempPassword) newErrors.tempPassword = "La contraseña temporal es requerida";
    if (!resetForm.newPassword) newErrors.newPassword = "La nueva contraseña es requerida";
    else if (resetForm.newPassword.length < 6) newErrors.newPassword = "Mínimo 6 caracteres";
    if (!resetForm.confirmPassword) newErrors.confirmPassword = "Confirma la contraseña";
    else if (resetForm.newPassword !== resetForm.confirmPassword) newErrors.confirmPassword = "Las contraseñas no coinciden";
    return newErrors;
  };

  const handleStep2Submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const validationErrors = validateReset();
    if (Object.keys(validationErrors).length > 0) {
      setResetErrors(validationErrors);
      return;
    }

    setResetLoading(true);
    try {
      const result = await resetPassword(resetForm);
      if (result.ok) {
        setIsSuccess(true);
      } else {
        const data = await result.json();
        setResetErrors({ general: data.error ?? "Ocurrió un error. Intenta de nuevo." });
      }
    } catch {
      setResetErrors({ general: "Ocurrió un error inesperado." });
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-r from-pink-200 to-pink-400 px-4">
      <div className="bg-white p-8 rounded-2xl shadow-lg w-full max-w-md">
        <div className="text-center mb-8">
          <Image src="/logo.svg" alt="Top Modas Logo" width={80} height={80} className="mx-auto mb-3" />
          <h1 className="text-2xl font-bold text-pink-800 uppercase tracking-wide">
            Restablecer Contraseña
          </h1>
          <p className="text-sm text-gray-500 mt-2">Paso {step} de 2</p>
        </div>

        {!isSuccess ? (
          <>
            {step === 1 ? (
              // PASO 1: Ingresar correo
              <form onSubmit={handleStep1Submit} className="space-y-4" noValidate>
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                    Correo electrónico registrado:
                  </label>
                  <input
                    type="email"
                    id="email"
                    value={step1Email}
                    onChange={(e) => {
                      setStep1Email(e.target.value);
                      setStep1Error("");
                    }}
                    placeholder="correo@ejemplo.com"
                    className={`w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-pink-500 transition-colors ${
                      step1Error ? "border-red-400 bg-red-50" : "border-gray-300"
                    }`}
                    disabled={step1Loading}
                  />
                  {step1Error && <p className="mt-1 text-xs text-red-500">{step1Error}</p>}
                </div>

                <p className="text-xs text-gray-600 bg-blue-50 border border-blue-200 rounded-md p-3">
                  📧 Recibirás un código temporal en tu correo. Úsalo en el siguiente paso para cambiar tu contraseña.
                </p>

                <button
                  type="submit"
                  disabled={step1Loading}
                  className="w-full bg-gradient-to-r from-pink-400 to-pink-600 text-white py-2.5 rounded-md hover:from-pink-500 hover:to-pink-700 transition-all duration-300 font-medium disabled:opacity-60"
                >
                  {step1Loading ? "Enviando..." : "Enviar código"}
                </button>

                <div className="text-center">
                  <button
                    type="button"
                    onClick={() => router.push("/")}
                    className="text-pink-600 hover:underline text-sm"
                  >
                    Cancelar / Ir a inicio
                  </button>
                </div>
              </form>
            ) : (
              // PASO 2: Ingresar código y nueva contraseña
              <form onSubmit={handleStep2Submit} className="space-y-4" noValidate>
                <div className="bg-green-50 border border-green-200 rounded-md p-3 text-sm text-green-700">
                  ✓ Código enviado a <strong>{resetForm.email}</strong>
                </div>

                <div>
                  <label htmlFor="tempPassword" className="block text-sm font-medium text-gray-700 mb-2">
                    Código temporal:
                  </label>
                  <input
                    type="text"
                    id="tempPassword"
                    name="tempPassword"
                    value={resetForm.tempPassword}
                    onChange={handleResetChange}
                    placeholder="Ej: A1B2C3D4"
                    className={`w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-pink-500 font-mono tracking-widest uppercase ${
                      resetErrors.tempPassword ? "border-red-400 bg-red-50" : "border-gray-300"
                    }`}
                    disabled={resetLoading}
                  />
                  {resetErrors.tempPassword && <p className="mt-1 text-xs text-red-500">{resetErrors.tempPassword}</p>}
                </div>

                <div>
                  <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 mb-2">
                    Nueva contraseña:
                  </label>
                  <input
                    type="password"
                    id="newPassword"
                    name="newPassword"
                    value={resetForm.newPassword}
                    onChange={handleResetChange}
                    placeholder="••••••••"
                    className={`w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-pink-500 ${
                      resetErrors.newPassword ? "border-red-400 bg-red-50" : "border-gray-300"
                    }`}
                    disabled={resetLoading}
                  />
                  {resetErrors.newPassword && <p className="mt-1 text-xs text-red-500">{resetErrors.newPassword}</p>}
                </div>

                <div>
                  <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
                    Confirmar contraseña:
                  </label>
                  <input
                    type="password"
                    id="confirmPassword"
                    name="confirmPassword"
                    value={resetForm.confirmPassword}
                    onChange={handleResetChange}
                    placeholder="••••••••"
                    className={`w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-pink-500 ${
                      resetErrors.confirmPassword ? "border-red-400 bg-red-50" : "border-gray-300"
                    }`}
                    disabled={resetLoading}
                  />
                  {resetErrors.confirmPassword && <p className="mt-1 text-xs text-red-500">{resetErrors.confirmPassword}</p>}
                </div>

                {resetErrors.general && (
                  <div className="text-sm text-red-500 text-center bg-red-50 border border-red-200 rounded-md py-2 px-3">
                    {resetErrors.general}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={resetLoading}
                  className="w-full bg-gradient-to-r from-pink-400 to-pink-600 text-white py-2.5 rounded-md hover:from-pink-500 hover:to-pink-700 transition-all duration-300 font-medium disabled:opacity-60"
                >
                  {resetLoading ? "Restableciendo..." : "Restablecer contraseña"}
                </button>

                <div className="text-center space-y-2">
                  <button
                    type="button"
                    onClick={() => {
                      setStep(1);
                      setStep1Email("");
                      setResetErrors({});
                    }}
                    className="text-pink-600 hover:underline text-sm block w-full"
                  >
                    Volver al paso 1
                  </button>
                  <button
                    type="button"
                    onClick={() => router.push("/")}
                    className="text-gray-600 hover:underline text-sm"
                  >
                    Cancelar / Ir a inicio
                  </button>
                </div>
              </form>
            )}
          </>
        ) : (
          // Mensaje de éxito
          <div className="text-center py-4">
            <div className="w-16 h-16 bg-pink-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-pink-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-pink-700 mb-2">¡Contraseña restablecida!</h3>
            <p className="text-sm text-gray-500 mb-6">
              Tu contraseña fue actualizada exitosamente. Ya puedes iniciar sesión con tu nueva contraseña.
            </p>
            <button
              onClick={() => router.push("/")}
              className="w-full bg-gradient-to-r from-pink-400 to-pink-600 text-white py-2.5 rounded-md hover:from-pink-500 hover:to-pink-700 transition-all font-medium"
            >
              Iniciar sesión
            </button>
          </div>
        )}
      </div>

      <footer className="absolute bottom-4 text-center w-full text-white text-sm">
        © 2024 Top Modas. Todos los derechos reservados.
      </footer>
    </div>
  );
}
