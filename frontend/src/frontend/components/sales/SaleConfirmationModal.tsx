"use client";

import { AlertCircle, CheckCircle, CreditCard, Download, X } from "lucide-react";
import { useState } from "react";
import type { PaymentMethod } from "./PaymentMethodSelector";

interface SaleConfirmationModalProps {
  isOpen: boolean;
  receiptNumber: string;
  total: number;
  itemCount: number;
  customerName: string;
  paymentMethod?: PaymentMethod;
  onDownloadPDF: () => void;
  onClose: () => void;
  onNewSale: () => void;
}

const getPaymentMethodLabel = (method?: PaymentMethod): string => {
  const methods: Record<PaymentMethod, string> = {
    efectivo: "Efectivo",
    tarjeta_debito: "Tarjeta debito",
    tarjeta_credito: "Tarjeta credito",
    yape: "Yape",
    plin: "Plin",
    transferencia: "Transferencia",
    qr: "Pago QR",
    billetera_digital: "Billetera digital",
  };
  return methods[method || "efectivo"] || "Sin especificar";
};

export function SaleConfirmationModal({
  isOpen,
  receiptNumber,
  total,
  itemCount,
  customerName,
  paymentMethod,
  onDownloadPDF,
  onClose,
  onNewSale,
}: SaleConfirmationModalProps) {
  const [isPdfDownloading, setIsPdfDownloading] = useState(false);

  if (!isOpen) return null;

  const handleDownloadClick = () => {
    try {
      setIsPdfDownloading(true);
      onDownloadPDF();
      setTimeout(() => setIsPdfDownloading(false), 900);
    } catch (error) {
      console.error("Error descargando PDF:", error);
      alert("Error al descargar el PDF");
      setIsPdfDownloading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md overflow-hidden rounded-lg bg-white shadow-2xl">
        <div className="bg-gradient-to-r from-green-500 to-emerald-600 px-6 py-7 text-center">
          <div className="mb-3 flex justify-center">
            <div className="rounded-full bg-white/20 p-4 backdrop-blur">
              <CheckCircle className="h-11 w-11 text-white" />
            </div>
          </div>
          <h2 className="text-2xl font-bold text-white">Venta completada</h2>
          <p className="mt-2 text-sm text-green-100">La transaccion fue exitosa</p>
        </div>

        <div className="space-y-5 px-6 py-7">
          <div className="space-y-4 rounded-md border border-gray-200 bg-gray-50 p-4">
            <div className="flex items-center justify-between border-b border-gray-200 pb-3">
              <span className="text-sm font-medium text-gray-600">Boleta:</span>
              <span className="font-mono text-sm font-bold text-gray-800">{receiptNumber}</span>
            </div>
            <div className="flex items-center justify-between border-b border-gray-200 pb-3">
              <span className="text-sm font-medium text-gray-600">Cliente:</span>
              <span className="text-sm font-semibold text-gray-800">{customerName}</span>
            </div>
            <div className="flex items-center justify-between border-b border-gray-200 pb-3">
              <span className="text-sm font-medium text-gray-600">Productos:</span>
              <span className="text-sm font-semibold text-gray-800">{itemCount}</span>
            </div>
            <div className="flex items-center justify-between border-b border-gray-200 pb-3">
              <span className="text-sm font-medium text-gray-600">Metodo:</span>
              <div className="flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-semibold text-gray-800">{getPaymentMethodLabel(paymentMethod)}</span>
              </div>
            </div>
            <div className="flex items-center justify-between pt-1">
              <span className="text-sm font-bold text-gray-700">Total:</span>
              <span className="text-2xl font-bold text-green-600">S/. {total.toFixed(2)}</span>
            </div>
          </div>

          <div className="space-y-3">
            <button
              type="button"
              onClick={handleDownloadClick}
              disabled={isPdfDownloading}
              className="flex w-full items-center justify-center gap-2 rounded-md bg-gradient-to-r from-blue-500 to-blue-600 py-3 font-semibold text-white transition-all hover:from-blue-600 hover:to-blue-700 disabled:opacity-60"
            >
              <Download className="h-5 w-5" />
              {isPdfDownloading ? "Descargando..." : "Descargar boleta PDF"}
            </button>

            <button
              type="button"
              onClick={onNewSale}
              className="w-full rounded-md bg-gradient-to-r from-pink-500 to-pink-600 py-3 font-semibold text-white transition-all hover:from-pink-600 hover:to-pink-700"
            >
              Nueva venta
            </button>

            <button
              type="button"
              onClick={onClose}
              className="flex w-full items-center justify-center gap-2 rounded-md bg-gray-100 py-3 font-semibold text-gray-700 transition-all hover:bg-gray-200"
            >
              <X className="h-5 w-5" />
              Cerrar
            </button>
          </div>

          <div className="flex gap-3 rounded-md border border-blue-200 bg-blue-50 p-3">
            <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-blue-600" />
            <p className="text-xs text-blue-700">
              Si el navegador bloqueo la descarga automatica, usa el boton de descarga.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
