"use client";

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-r from-pink-200 to-pink-400 flex-col">
      <div className="bg-white p-8 rounded-2xl shadow-lg w-96 max-w-md">
        {children}
      </div>
      <footer className="bottom-4 text-center w-full text-white text-sm mt-2">
        © 2024 Top Modas. Todos los derechos reservados.
      </footer>
    </div>
  );
}
