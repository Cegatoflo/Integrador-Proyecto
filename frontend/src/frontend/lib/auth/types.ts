export interface ValidationErrors {
  email?: string;
  password?: string;
  general?: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}
