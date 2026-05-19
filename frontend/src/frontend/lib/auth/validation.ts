import { ValidationErrors, LoginCredentials } from "./types";

export const validateLoginForm = (
  credentials: LoginCredentials
): ValidationErrors => {
  const errors: ValidationErrors = {};

  if (!credentials.email) {
    errors.email = "El correo electrónico es requerido";
  } else if (!/\S+@\S+\.\S+/.test(credentials.email)) {
    errors.email = "El correo electrónico no es válido";
  }

  if (!credentials.password) {
    errors.password = "La contraseña es requerida";
  } else if (credentials.password.length < 6) {
    errors.password = "La contraseña debe tener al menos 6 caracteres";
  }

  return errors;
};
