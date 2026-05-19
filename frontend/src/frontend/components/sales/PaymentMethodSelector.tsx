"use client";

import { Banknote, CreditCard, Landmark, QrCode, Smartphone, WalletCards } from "lucide-react";

interface PaymentMethodSelectorProps {
  selectedMethod: string;
  onMethodChange: (method: string) => void;
  total: number;
}

export type PaymentMethod =
  | "efectivo"
  | "tarjeta_debito"
  | "tarjeta_credito"
  | "yape"
  | "plin"
  | "transferencia"
  | "qr"
  | "billetera_digital";

interface MethodConfig {
  id: PaymentMethod;
  name: string;
  description: string;
  icon: React.ReactNode;
}

const paymentMethods: MethodConfig[] = [
  {
    id: "efectivo",
    name: "Efectivo",
    description: "Caja",
    icon: <Banknote className="h-5 w-5" />,
  },
  {
    id: "tarjeta_debito",
    name: "Debito",
    description: "Visa o MC",
    icon: <CreditCard className="h-5 w-5" />,
  },
  {
    id: "tarjeta_credito",
    name: "Credito",
    description: "Visa o MC",
    icon: <WalletCards className="h-5 w-5" />,
  },
  {
    id: "yape",
    name: "Yape",
    description: "Billetera",
    icon: <Smartphone className="h-5 w-5" />,
  },
  {
    id: "plin",
    name: "Plin",
    description: "Billetera",
    icon: <Smartphone className="h-5 w-5" />,
  },
  {
    id: "transferencia",
    name: "Transfer.",
    description: "Banco",
    icon: <Landmark className="h-5 w-5" />,
  },
  {
    id: "qr",
    name: "QR",
    description: "Codigo",
    icon: <QrCode className="h-5 w-5" />,
  },
  {
    id: "billetera_digital",
    name: "Wallet",
    description: "Digital",
    icon: <WalletCards className="h-5 w-5" />,
  },
];

export function PaymentMethodSelector({
  selectedMethod,
  onMethodChange,
  total,
}: PaymentMethodSelectorProps) {
  const current = paymentMethods.find((method) => method.id === selectedMethod);

  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CreditCard className="h-4 w-4 text-pink-600" />
          <label className="text-sm font-bold text-gray-800">Metodo de pago</label>
        </div>
        <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-bold text-gray-700">
          S/. {total.toFixed(2)}
        </span>
      </div>

      <div
        className="grid gap-2"
        style={{ gridTemplateColumns: "repeat(4, minmax(0, 1fr))" }}
      >
        {paymentMethods.map((method) => {
          const selected = selectedMethod === method.id;
          return (
            <button
              key={method.id}
              type="button"
              onClick={() => onMethodChange(method.id)}
              title={`${method.name} - ${method.description}`}
              className={`h-14 min-w-0 rounded-md border px-1.5 py-1.5 text-center transition-all ${
                selected
                  ? "border-pink-500 bg-pink-50 text-pink-700 shadow-sm"
                  : "border-gray-200 bg-white text-gray-600 hover:border-pink-200 hover:bg-pink-50/60"
              }`}
            >
              <div className="mx-auto flex h-4 w-4 items-center justify-center [&>svg]:h-4 [&>svg]:w-4">{method.icon}</div>
              <p className="mt-1 truncate text-[10px] font-bold leading-tight">{method.name}</p>
            </button>
          );
        })}
      </div>

      <div className="flex items-center justify-between rounded-md border border-gray-200 bg-gray-50 px-3 py-1.5">
        <span className="text-xs text-gray-500">Seleccionado</span>
        <span className="text-sm font-semibold text-gray-800">{current?.name || "Pendiente"}</span>
      </div>
    </div>
  );
}
