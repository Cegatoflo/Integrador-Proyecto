"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CheckCircle,
  CreditCard,
  Minus,
  Plus,
  QrCode,
  Search,
  ShoppingCart,
  Trash2,
  UserCheck,
  UserPlus,
  UserX,
  X,
} from "lucide-react";
import { getProducts, processSale, getPromotions, type Product, type Promotion } from "@/frontend/lib/dashboard/api";
import { createCustomer, getCustomers, type Customer as RegisteredCustomer } from "@/frontend/lib/customers/api";
import { getBestPromotionForProduct } from "@/frontend/lib/sales/promotions";
import { PaymentMethodSelector, type PaymentMethod } from "@/frontend/components/sales/PaymentMethodSelector";
import { generateReceiptNumber, generateReceiptPDF } from "@/frontend/lib/sales/receiptGenerator";

type CartItem = Product & { quantity: number };

const electronicMethods: PaymentMethod[] = [
  "tarjeta_debito",
  "tarjeta_credito",
  "yape",
  "plin",
  "transferencia",
  "qr",
  "billetera_digital",
];

const paymentLabels: Record<PaymentMethod, string> = {
  efectivo: "Efectivo",
  tarjeta_debito: "Tarjeta debito",
  tarjeta_credito: "Tarjeta credito",
  yape: "Yape",
  plin: "Plin",
  transferencia: "Transferencia",
  qr: "Pago QR",
  billetera_digital: "Wallet",
};

const makeTransactionReference = (method: PaymentMethod) =>
  `${method.toUpperCase().replace(/_/g, "-")}-${Date.now().toString().slice(-7)}`;

const normalizePhone = (phone: string) => phone.replace(/\D/g, "").slice(0, 9);
const validatePhone = (phone: string) => phone === "" || /^9\d{8}$/.test(phone);

function FakeQr({ seed }: { seed: string }) {
  const cells = useMemo(() => {
    let hash = 0;
    for (let i = 0; i < seed.length; i += 1) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
    return Array.from({ length: 121 }, (_, index) => {
      const row = Math.floor(index / 11);
      const col = index % 11;
      const marker =
        (row < 3 && col < 3) ||
        (row < 3 && col > 7) ||
        (row > 7 && col < 3);
      hash = (hash * 1664525 + 1013904223) >>> 0;
      return marker || (hash + row + col) % 3 === 0;
    });
  }, [seed]);

  return (
    <div className="grid h-36 w-36 grid-cols-11 gap-1 rounded-md bg-white p-3 shadow-inner ring-1 ring-gray-200">
      {cells.map((filled, index) => (
        <span key={index} className={filled ? "rounded-[1px] bg-gray-900" : "rounded-[1px] bg-white"} />
      ))}
    </div>
  );
}

export default function CajaPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [filtered, setFiltered] = useState<Product[]>([]);
  const [registeredCustomers, setRegisteredCustomers] = useState<RegisteredCustomer[]>([]);
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [customerDni, setCustomerDni] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [saleWithoutCustomer, setSaleWithoutCustomer] = useState(false);
  const [quickCustomerName, setQuickCustomerName] = useState("");
  const [quickCustomerPhone, setQuickCustomerPhone] = useState("");
  const [quickCustomerError, setQuickCustomerError] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("efectivo");
  const [amountPaid, setAmountPaid] = useState("");
  const [transactionReference, setTransactionReference] = useState("");
  const [paymentConfirmed, setPaymentConfirmed] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [cardData, setCardData] = useState({ number: "", name: "", expiry: "", cvv: "" });
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [saleError, setSaleError] = useState("");
  const [saleSuccess, setSaleSuccess] = useState(false);

  useEffect(() => {
    getProducts()
      .then((data) => {
        const available = data.filter((p) => p.stock > 0);
        setProducts(available);
        setFiltered(available);
      })
      .finally(() => setLoading(false));

    getCustomers()
      .then((data) => setRegisteredCustomers(data))
      .catch(() => setRegisteredCustomers([]));

    getPromotions()
      .then((data) => setPromotions(data))
      .catch(() => setPromotions([]));
  }, []);

  useEffect(() => {
    const q = search.toLowerCase();
    setFiltered(products.filter((p) =>
      p.name.toLowerCase().includes(q) ||
      p.category.toLowerCase().includes(q) ||
      (p.sku || "").toLowerCase().includes(q)
    ));
  }, [search, products]);

  const pricedCart = useMemo(
    () =>
      cart.map((item) => {
        const applied = getBestPromotionForProduct(item, promotions);
        const unitPrice = applied ? applied.discountedUnitPrice : item.price;
        return { item, applied, unitPrice, lineTotal: unitPrice * item.quantity };
      }),
    [cart, promotions]
  );
  const total = pricedCart.reduce((sum, row) => sum + row.lineTotal, 0);
  const totalOriginal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const totalDiscount = totalOriginal - total;
  const isElectronicPayment = electronicMethods.includes(paymentMethod);
  const paidAmount = paymentMethod === "efectivo" ? Number(amountPaid || 0) : total;
  const change = Math.max(0, paidAmount - total);
  const registeredCustomer = registeredCustomers.find((customer) => customer.dni === customerDni.trim());
  const hasCustomer = saleWithoutCustomer || customerDni.length === 8;
  const canSell =
    cart.length > 0 &&
    !processing &&
    hasCustomer &&
    (paymentMethod !== "efectivo" || paidAmount >= total) &&
    (!isElectronicPayment || paymentConfirmed);

  useEffect(() => {
    if (paymentMethod !== "efectivo") {
      setAmountPaid(total > 0 ? total.toFixed(2) : "");
    }
    setPaymentConfirmed(paymentMethod === "efectivo");
    setTransactionReference(paymentMethod === "efectivo" ? "" : makeTransactionReference(paymentMethod));
  }, [paymentMethod, total]);

  useEffect(() => {
    if (registeredCustomer?.email && !customerEmail) {
      setCustomerEmail(registeredCustomer.email);
    }
  }, [registeredCustomer, customerEmail]);

  const addToCart = (product: Product) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.id === product.id);
      if (existing) {
        if (existing.quantity >= product.stock) return prev;
        return prev.map((item) => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...prev, { ...product, quantity: 1 }];
    });
  };

  const decreaseCart = (productId: string) => {
    setCart((prev) =>
      prev
        .map((item) => item.id === productId ? { ...item, quantity: item.quantity - 1 } : item)
        .filter((item) => item.quantity > 0)
    );
  };

  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.id !== productId));
  };

  const registerQuickCustomer = async () => {
    const dni = customerDni.trim();
    const email = customerEmail.trim();
    const phone = normalizePhone(quickCustomerPhone);

    if (!/^\d{8}$/.test(dni)) {
      setQuickCustomerError("Ingresa un DNI valido de 8 numeros.");
      return;
    }
    if (!quickCustomerName.trim()) {
      setQuickCustomerError("Ingresa el nombre del cliente.");
      return;
    }
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setQuickCustomerError("Ingresa un correo valido.");
      return;
    }
    if (!validatePhone(phone)) {
      setQuickCustomerError("Telefono invalido. Debe tener 9 digitos y empezar con 9.");
      return;
    }

    try {
      const customer = await createCustomer({
        name: quickCustomerName.trim(),
        dni,
        email: email || undefined,
        phone: phone || undefined,
      });
      setRegisteredCustomers((prev) => [customer, ...prev]);
      setQuickCustomerName("");
      setQuickCustomerPhone("");
      setQuickCustomerError("");
    } catch (err) {
      setQuickCustomerError(err instanceof Error ? err.message : "Error al registrar cliente");
    }
  };

  const refreshProducts = async () => {
    const updated = await getProducts();
    const available = updated.filter((p) => p.stock > 0);
    setProducts(available);
    setFiltered(available);
  };

  const getCardType = (cardNumber: string) => {
    const cleanNumber = cardNumber.replace(/\D/g, "");
    if (cleanNumber.startsWith("4")) return "visa";
    if (cleanNumber.startsWith("5")) return "mastercard";
    return null;
  };

  const formatCardNumber = (value: string) => {
    const cleanNumber = value.replace(/\D/g, "").slice(0, 16);
    const parts = cleanNumber.match(/.{1,4}/g) || [];
    return parts.join(" ");
  };

  const formatExpiry = (value: string) => {
    const cleanValue = value.replace(/\D/g, "").slice(0, 4);
    if (cleanValue.length <= 2) return cleanValue;
    return `${cleanValue.slice(0, 2)}/${cleanValue.slice(2)}`;
  };

  const confirmPaymentSimulation = () => {
    if (paymentMethod === "tarjeta_debito" || paymentMethod === "tarjeta_credito") {
      const cleanCardNumber = cardData.number.replace(/\D/g, "");
      const trimmedName = cardData.name.trim();
      
      // Validar que todos los campos sean obligatorios
      if (!cardData.number.trim() || !trimmedName || !cardData.expiry.trim() || !cardData.cvv.trim()) {
        setSaleError("Todos los campos de la tarjeta son obligatorios.");
        return;
      }
      
      // Validar número de tarjeta
      if (cleanCardNumber.length !== 16) {
        setSaleError("El número de tarjeta debe tener exactamente 16 dígitos.");
        return;
      }
      
      // Validar que sea Visa o Mastercard
      const cardType = getCardType(cardData.number);
      if (!cardType) {
        setSaleError("Solo se aceptan tarjetas Visa (4) o Mastercard (5).");
        return;
      }
      
      // Validar titular
      if (trimmedName.length < 3) {
        setSaleError("El nombre del titular debe tener al menos 3 caracteres.");
        return;
      }
      
      if (trimmedName.length > 50) {
        setSaleError("El nombre del titular no puede exceder 50 caracteres.");
        return;
      }
      
      // Validar que no contenga números
      if (/\d/.test(trimmedName)) {
        setSaleError("El nombre del titular no puede contener números.");
        return;
      }
      
      // Validar que no contenga símbolos especiales
      const specialCharsRegex = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/g;
      if (specialCharsRegex.test(trimmedName)) {
        setSaleError("El nombre del titular no puede contener símbolos especiales.");
        return;
      }
      
      // Validar fecha de expiración
      const expiryClean = cardData.expiry.replace(/\D/g, "");
      if (expiryClean.length !== 4) {
        setSaleError("La fecha debe estar en formato MM/AA (ej: 12/25).");
        return;
      }
      
      const expiryMonth = parseInt(expiryClean.slice(0, 2), 10);
      if (expiryMonth < 1 || expiryMonth > 12) {
        setSaleError("El mes debe estar entre 01 y 12.");
        return;
      }
      
      // Verificar que el año sea igual o mayor al año actual
      const year = expiryClean.slice(2);
      const currentDate = new Date();
      const currentYear = currentDate.getFullYear() % 100;
      const currentMonth = currentDate.getMonth() + 1;
      const cardYear = parseInt(year, 10);
      const cardMonth = expiryMonth;
      
      if (cardYear < currentYear) {
        setSaleError(`La tarjeta debe ser mayor o iguala 20${currentYear.toString().padStart(2, "0")}.`);
        return;
      }
      
      if (cardYear === currentYear && cardMonth < currentMonth) {
        setSaleError("El mes de este año ya paso.");
        return;
      }
      
      // Validar CVV
      const cleanCvv = cardData.cvv.replace(/\D/g, "");
      if (cleanCvv.length < 3 || cleanCvv.length > 4) {
        setSaleError("El CVV debe tener 3 o 4 dígitos.");
        return;
      }
    }
    
    setSaleError("");
    setPaymentConfirmed(true);
    setShowPaymentModal(false);
  };

  const handleSale = async () => {
    if (cart.length === 0) return;

    if (!saleWithoutCustomer && !/^\d{8}$/.test(customerDni.trim())) {
      setSaleError("Ingresa un DNI valido de 8 numeros.");
      return;
    }

    if (customerEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail)) {
      setSaleError("Ingresa un correo valido.");
      return;
    }

    if (paymentMethod === "efectivo" && paidAmount < total) {
      setSaleError("El monto recibido debe ser igual o mayor al total.");
      return;
    }

    if (isElectronicPayment && !paymentConfirmed) {
      setSaleError("Primero simula y confirma el pago electronico.");
      setShowPaymentModal(true);
      return;
    }

    setSaleError("");
    setProcessing(true);

    const receiptNumber = generateReceiptNumber();
    const soldRows = pricedCart;
    const dni = saleWithoutCustomer ? "" : customerDni.trim();
    const email = saleWithoutCustomer ? "" : customerEmail.trim();
    const customerName = saleWithoutCustomer ? "Cliente generico" : registeredCustomer?.name || `Cliente ${dni}`;

    try {
      await processSale({
        receiptNumber,
        items: soldRows.map((row) => ({ productId: row.item.id, quantity: row.item.quantity, price: row.unitPrice })),
        customerName,
        customerDni: dni || undefined,
        customerEmail: email || undefined,
        paymentMethod,
        paymentStatus: "approved",
        transactionReference: transactionReference || undefined,
        amountPaid: paidAmount,
        changeAmount: change,
      });

      generateReceiptPDF({
        receiptNumber,
        date: new Date().toISOString(),
        customerName,
        customerDni: dni || undefined,
        customerEmail: email || undefined,
        items: soldRows.map((row) => ({
          name: row.item.name,
          sku: row.item.sku,
          quantity: row.item.quantity,
          price: row.unitPrice,
          originalPrice: row.applied ? row.item.price : undefined,
          promoLabel: row.applied?.label,
        })),
        total,
        paymentMethod,
      });

      setSaleSuccess(true);
      setCart([]);
      setCustomerDni("");
      setCustomerEmail("");
      setSaleWithoutCustomer(false);
      setQuickCustomerName("");
      setQuickCustomerPhone("");
      setQuickCustomerError("");
      setPaymentMethod("efectivo");
      setAmountPaid("");
      setPaymentConfirmed(false);
      setTransactionReference("");
      setCardData({ number: "", name: "", expiry: "", cvv: "" });
      await refreshProducts();
    } catch (err) {
      setSaleError(err instanceof Error ? err.message : "Error al procesar venta");
    } finally {
      setProcessing(false);
    }
  };

  if (saleSuccess) {
    return (
      <div className="flex min-h-[55vh] flex-col items-center justify-center space-y-4">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-pink-100">
          <CheckCircle className="h-10 w-10 text-pink-600" />
        </div>
        <h2 className="text-2xl font-bold text-gray-800">Venta realizada</h2>
        <p className="text-gray-500">La venta fue procesada y la boleta se descargo automaticamente.</p>
        <button
          type="button"
          onClick={() => setSaleSuccess(false)}
          className="rounded-lg bg-gradient-to-r from-pink-500 to-pink-700 px-8 py-3 font-semibold text-white"
        >
          Nueva venta
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">CAJA</h1>
          <p className="text-sm text-gray-500">Venta rapida, cliente, pago y boleta automatica.</p>
        </div>
        <div className="rounded-lg bg-white px-5 py-2 text-right shadow-sm ring-1 ring-gray-100">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Total actual</p>
          <p className="text-2xl font-bold text-pink-700">S/. {total.toFixed(2)}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_430px]">
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar producto, SKU o categoria..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-lg border border-gray-200 bg-white py-3 pl-10 pr-4 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-pink-400"
            />
          </div>

          <div className="overflow-hidden rounded-lg bg-white shadow-sm ring-1 ring-gray-100">
            <div className="flex items-center justify-between border-b border-gray-100 bg-pink-50 px-5 py-3">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-pink-700">Inventario disponible</h2>
              <span className="text-xs font-semibold text-pink-700">{filtered.length} productos</span>
            </div>

            {loading ? (
              <div className="px-5 py-8 text-center text-sm text-gray-400">Cargando...</div>
            ) : filtered.length === 0 ? (
              <div className="px-5 py-8 text-center text-sm text-gray-400">No se encontraron productos</div>
            ) : (
              <div className="max-h-[560px] overflow-y-auto">
                <div className="grid grid-cols-[minmax(180px,1fr)_110px_90px_140px] border-b border-gray-100 bg-gray-50 px-5 py-2 text-xs font-bold uppercase tracking-wide text-gray-500">
                  <span>Producto</span>
                  <span>Stock</span>
                  <span className="text-right">Precio</span>
                  <span className="text-right">Accion</span>
                </div>
                <div className="divide-y divide-gray-50">
                  {filtered.map((product) => {
                    const inCart = cart.find((item) => item.id === product.id);
                    return (
                      <div key={product.id} className="grid grid-cols-[minmax(180px,1fr)_110px_90px_140px] items-center px-5 py-3 transition-colors hover:bg-pink-50/40">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-bold text-gray-800">{product.name}</p>
                          <p className="text-xs text-gray-400">
                            {product.sku ? `${product.sku} - ` : ""}{product.category}
                          </p>
                        </div>
                        <span className="text-xs font-semibold text-gray-500">{product.stock} und.</span>
                        <span className="text-right text-sm font-bold text-pink-700">S/. {product.price.toFixed(2)}</span>
                        <div className="flex items-center justify-end gap-2">
                          {inCart ? (
                            <>
                              <button
                                type="button"
                                onClick={() => decreaseCart(product.id)}
                                className="flex h-7 w-7 items-center justify-center rounded-full bg-pink-100 text-pink-700"
                              >
                                <Minus className="h-3.5 w-3.5" />
                              </button>
                              <span className="w-7 text-center text-sm font-bold text-gray-700">{inCart.quantity}</span>
                              <button
                                type="button"
                                onClick={() => addToCart(product)}
                                disabled={inCart.quantity >= product.stock}
                                className="flex h-7 w-7 items-center justify-center rounded-full bg-pink-500 text-white disabled:opacity-40"
                              >
                                <Plus className="h-3.5 w-3.5" />
                              </button>
                            </>
                          ) : (
                            <button
                              type="button"
                              onClick={() => addToCart(product)}
                              className="rounded-md bg-pink-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-pink-700"
                            >
                              Agregar
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-3 xl:sticky xl:top-4 xl:self-start">
          <div className="overflow-hidden rounded-lg bg-white shadow-sm ring-1 ring-gray-100">
            <div className="flex items-center gap-2 border-b border-gray-100 bg-pink-50 px-4 py-3">
              <ShoppingCart className="h-4 w-4 text-pink-600" />
              <h2 className="text-sm font-semibold uppercase tracking-wide text-pink-700">Compra</h2>
            </div>

            {cart.length === 0 ? (
              <div className="px-5 py-7 text-center text-sm text-gray-400">Agrega productos desde el inventario</div>
            ) : (
              <div className="max-h-[180px] divide-y divide-gray-50 overflow-y-auto">
                {pricedCart.map(({ item, applied, unitPrice, lineTotal }) => (
                  <div key={item.id} className="flex items-center gap-3 px-4 py-2.5">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-bold text-gray-800">{item.name}</p>
                      {applied ? (
                        <p className="text-xs text-gray-400">
                          {item.quantity} x <span className="font-semibold text-emerald-600">S/. {unitPrice.toFixed(2)}</span>
                          <span className="ml-1 line-through">S/. {item.price.toFixed(2)}</span>
                          <span className="ml-1 rounded bg-emerald-50 px-1 text-[10px] font-bold text-emerald-700">-{applied.label}</span>
                        </p>
                      ) : (
                        <p className="text-xs text-gray-400">{item.quantity} x S/. {item.price.toFixed(2)}</p>
                      )}
                    </div>
                    <span className="w-16 text-right text-xs font-bold text-pink-700">S/. {lineTotal.toFixed(2)}</span>
                    <button
                      type="button"
                      onClick={() => removeFromCart(item.id)}
                      className="inline-flex items-center gap-1 rounded-md border border-red-100 bg-red-50 px-2 py-1 text-[11px] font-bold text-red-600 hover:bg-red-100"
                      title="Quitar de la compra"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Quitar
                    </button>
                  </div>
                ))}
              </div>
            )}

            {totalDiscount > 0 && (
              <div className="flex items-center justify-between border-t border-gray-100 px-4 pt-3 text-xs">
                <span className="text-gray-500">Descuento por promociones</span>
                <span className="font-bold text-emerald-600">- S/. {totalDiscount.toFixed(2)}</span>
              </div>
            )}

            <div className="grid grid-cols-3 gap-2 border-t border-gray-100 bg-gray-50 p-4 text-center">
              <div>
                <p className="text-xs text-gray-500">Total</p>
                <p className="font-bold text-pink-700">S/. {total.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Paga</p>
                <p className="font-bold text-gray-800">S/. {paidAmount.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Vuelto</p>
                <p className="font-bold text-emerald-700">S/. {change.toFixed(2)}</p>
              </div>
            </div>
          </div>

          <div className="rounded-lg bg-white p-4 shadow-sm ring-1 ring-gray-100">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-bold text-gray-800">Cliente</h3>
              <label className="flex items-center gap-2 text-xs font-semibold text-gray-600">
                <input
                  type="checkbox"
                  checked={saleWithoutCustomer}
                  onChange={(e) => setSaleWithoutCustomer(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-pink-600"
                />
                <span title="Venta anónima: se registra como 'Cliente generico'. Útil para ventas rápidas en mostrador sin datos del comprador.">
                  Venta sin cliente ℹ️
                </span>
              </label>
            </div>

            {!saleWithoutCustomer ? (
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs text-gray-500">DNI registrado</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={customerDni}
                    onChange={(e) => setCustomerDni(e.target.value.replace(/\D/g, ""))}
                    placeholder="DNI"
                    maxLength={8}
                    className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-400"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-gray-500">Correo (opcional)</label>
                  <input
                    type="email"
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                    placeholder="correo@cliente.com"
                    className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-400"
                  />
                </div>
                <div className="sm:col-span-2">
                  {customerDni.length === 8 && registeredCustomer ? (
                    <div className="flex items-center gap-2 rounded-md bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700">
                      <UserCheck className="h-4 w-4" />
                      {registeredCustomer.name} — cliente registrado.
                    </div>
                  ) : customerDni.length === 8 ? (
                    <div className="space-y-3 rounded-md bg-blue-50 px-3 py-3 text-xs font-semibold text-blue-700">
                      <span className="flex items-center gap-2">
                        <UserX className="h-4 w-4" />
                        DNI no registrado — se guardará como &quot;Cliente {customerDni}&quot;. Puedes vender igual.
                      </span>
                      <div className="grid gap-2 sm:grid-cols-2">
                        <input
                          value={quickCustomerName}
                          onChange={(e) => setQuickCustomerName(e.target.value)}
                          placeholder="Nombre del cliente"
                          className="rounded-md border border-blue-100 px-3 py-2 text-xs text-gray-700 focus:outline-none focus:ring-2 focus:ring-pink-400"
                        />
                        <input
                          value={quickCustomerPhone}
                          onChange={(e) => setQuickCustomerPhone(normalizePhone(e.target.value))}
                          inputMode="numeric"
                          maxLength={9}
                          placeholder="Celular"
                          className="rounded-md border border-blue-100 px-3 py-2 text-xs text-gray-700 focus:outline-none focus:ring-2 focus:ring-pink-400"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={registerQuickCustomer}
                        className="shrink-0 inline-flex items-center gap-1 rounded-md bg-pink-600 px-2.5 py-1.5 text-white hover:bg-pink-700"
                      >
                        <UserPlus className="h-3.5 w-3.5" />
                        Registrar
                      </button>
                      {quickCustomerError && <p className="text-xs text-red-600">{quickCustomerError}</p>}
                    </div>
                  ) : null}
                </div>
              </div>
            ) : (
              <div className="rounded-md bg-gray-50 px-3 py-2 text-xs font-semibold text-gray-600">
                Se emitira como Cliente generico.
              </div>
            )}
          </div>

          <div className="rounded-lg bg-white p-4 shadow-sm ring-1 ring-gray-100">
            <PaymentMethodSelector
              selectedMethod={paymentMethod}
              onMethodChange={(method) => setPaymentMethod(method as PaymentMethod)}
              total={total}
            />

            <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_auto]">
              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-gray-500">
                  {paymentMethod === "efectivo" ? "Monto recibido" : "Importe pagado"}
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={amountPaid}
                  onChange={(e) => setAmountPaid(e.target.value)}
                  disabled={paymentMethod !== "efectivo"}
                  placeholder="0.00"
                  className="w-full rounded-md border border-gray-200 px-3 py-2.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-pink-400 disabled:bg-gray-50"
                />
              </div>
              {isElectronicPayment && (
                <button
                  type="button"
                  onClick={() => setShowPaymentModal(true)}
                  className={`self-end rounded-md px-4 py-2.5 text-xs font-bold text-white ${
                    paymentConfirmed ? "bg-emerald-600 hover:bg-emerald-700" : "bg-gray-900 hover:bg-black"
                  }`}
                >
                  {paymentConfirmed ? "Pago aprobado" : "Simular pago"}
                </button>
              )}
            </div>

            {isElectronicPayment && transactionReference && (
              <p className="mt-2 text-xs font-semibold text-gray-500">Ref: {transactionReference}</p>
            )}
          </div>

          {saleError && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-600">{saleError}</div>
          )}

          <button
            type="button"
            onClick={handleSale}
            disabled={!canSell}
            className="w-full rounded-lg bg-gradient-to-r from-pink-600 to-rose-600 py-3.5 text-sm font-bold uppercase tracking-wide text-white shadow-md transition-all hover:from-pink-700 hover:to-rose-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {processing ? "PROCESANDO..." : "REALIZAR VENTA"}
          </button>
        </div>
      </div>

      {showPaymentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-lg bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
              <div>
                <h3 className="font-bold text-gray-900">Simular pago</h3>
                <p className="text-xs text-gray-500">{paymentLabels[paymentMethod]} - S/. {total.toFixed(2)}</p>
              </div>
              <button type="button" onClick={() => setShowPaymentModal(false)} className="rounded-md p-1 text-gray-400 hover:bg-gray-100">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4 p-5">
              {saleError && paymentMethod !== "efectivo" && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">{saleError}</div>
              )}
              {paymentMethod === "tarjeta_debito" || paymentMethod === "tarjeta_credito" ? (
                <div className="space-y-3">
                  <div className="rounded-lg bg-gray-900 p-4 text-white">
                    <div className="mb-5 flex items-center justify-between">
                      <CreditCard className="h-6 w-6 text-pink-300" />
                      <span className="text-xs font-bold uppercase tracking-wider">
                        {getCardType(cardData.number) === "visa" && "🔵 VISA"}
                        {getCardType(cardData.number) === "mastercard" && "🔴 MASTERCARD"}
                        {!getCardType(cardData.number) && "TARJETA"}
                      </span>
                    </div>
                    <p className="font-mono text-lg tracking-widest">
                      {formatCardNumber(cardData.number) || "4242 4242 4242 4242"}
                    </p>
                    <div className="mt-4 flex justify-between text-xs text-gray-300">
                      <span>{cardData.name || "CLIENTE TOP MODAS"}</span>
                      <span>{cardData.expiry || "12/29"}</span>
                    </div>
                  </div>
                  <input 
                    className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm font-mono tracking-widest" 
                    placeholder="Numero de tarjeta" 
                    value={formatCardNumber(cardData.number)} 
                    onChange={(e) => {
                      const value = e.target.value.replace(/\D/g, "").slice(0, 16);
                      setCardData({ ...cardData, number: value });
                    }}
                    maxLength={19}
                  />
                  <input 
                    className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm" 
                    placeholder="Titular" 
                    value={cardData.name}
                    onChange={(e) => {
                      const value = e.target.value.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑ\s]/g, "").slice(0, 50);
                      setCardData({ ...cardData, name: value });
                    }}
                    maxLength={50}
                  />
                  <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Fecha de Vencimiento</label>
                    <input 
                      className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm font-mono" 
                      placeholder="MM/AA" 
                      value={formatExpiry(cardData.expiry)} 
                      onChange={(e) => {
                        const value = e.target.value.replace(/\D/g, "").slice(0, 4);
                        setCardData({ ...cardData, expiry: value });
                      }}
                      maxLength={5}
                    />
                  </div>
                    <input 
                      className="rounded-md border border-gray-200 px-3 py-2 text-sm" 
                      placeholder="CVV" 
                      value={cardData.cvv} 
                      onChange={(e) => {
                        const value = e.target.value.replace(/\D/g, "").slice(0, 4);
                        setCardData({ ...cardData, cvv: value });
                      }}
                      maxLength={4}
                    />
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-4">
                  <FakeQr seed={`${transactionReference}-${total}`} />
                  <div className="text-center">
                    <QrCode className="mx-auto mb-2 h-5 w-5 text-pink-600" />
                    <p className="text-sm font-bold text-gray-800">Escanea para pagar</p>
                    <p className="text-xs text-gray-500">Operacion simulada: {transactionReference}</p>
                  </div>
                </div>
              )}

              <button
                type="button"
                onClick={confirmPaymentSimulation}
                className="w-full rounded-md bg-pink-600 py-3 text-sm font-bold text-white hover:bg-pink-700"
              >
                Aprobar pago simulado
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
