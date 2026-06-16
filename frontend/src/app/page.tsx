import Image from "next/image";
import { LoginForm } from "@/frontend/components/auth/loginForm";
export default function Home() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-r from-pink-200 to-pink-400">
      <div className="bg-white p-8 rounded-2xl shadow-lg w-96 max-w-md">
        <div className="text-center mb-8">
          <Image
            src="/logo.svg"
            alt="Top Modas Logo"
            width={100}
            height={100}
            className="mx-auto mb-4"
          />
          <h1 className="text-3xl font-bold text-pink-900">Top Modas</h1>
        </div>
        <LoginForm />
      </div>
      <footer className="absolute bottom-4 text-center w-full text-white text-sm">
        © {new Date().getFullYear()} Top Modas. Todos los derechos reservados.
      </footer>
    </div>
  );
}
