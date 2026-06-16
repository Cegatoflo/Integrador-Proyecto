"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertCircle, Check, Minus, Plus, Search, ShoppingBag, Trash2, UserPlus, UserX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { SaleConfirmationModal } from "@/frontend/components/sales/SaleConfirmationModal";
import { PaymentMethodSelector, type PaymentMethod } from "@/frontend/components/sales/PaymentMethodSelector";
import { generateReceiptNumber, generateReceiptPDF } from "@/frontend/lib/sales/receiptGenerator";
import { getProducts, processSale, type Product } from "@/frontend/lib/dashboard/api";

type CartItem = Product & { quantity: number };

type Customer = {
  id: string;
  name: string;
  dni: string;
  email: string;
  phone: string;
};

const CUSTOMER_STORAGE_KEY = "top-modas-customers";

const loadCustomers = (): Customer[] => {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(CUSTOMER_STORAGE_KEY) || "[]") as Customer[];
  } catch {
    return [];
  }
};

const saveCustomers = (customers: Customer[]) => {
  localStorage.setItem(CUSTOMER_STORAGE_KEY, JSON.stringify(customers));
};

const normalizePhone = (phone: string) => phone.replace(/\D/g, "").slice(0, 9);
const validatePhone = (phone: string) => phone === "" || /^9\d{8}$/.test(phone);

export default function CreateSalePage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("efectivo");
  const [showCustomerForm, setShowCustomerForm] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [formError, setFormError] = useState("");
  const [lastReceiptData, setLastReceiptData] = useState<{
    receiptNumber: string;
    total: number;
    itemCount: number;
    customerName: string;
    customerDni: string;
    customerEmail: string;
    items: CartItem[];
    paymentMethod: PaymentMethod;
  } | null>(null);
  const [newCustomerData, setNewCustomerData] = useState({
    name: "",
    dni: "",
    email: "",
    phone: "",
  });

  useEffect(() => {
    setCustomers(loadCustomers());
    getProducts()
      .then((data) => setProducts(data.filter((product) => product.stock > 0)))
      .catch(() => setFormError("No se pudieron cargar los productos. Revisa que el backend este activo."))
      .finally(() => setLoading(false));
  }, []);

  const filteredProducts = useMemo(() => {
    const q = searchTerm.toLowerCase().trim();
    return products.filter(
      (product) =>
        product.name.toLowerCase().includes(q) ||
        product.category.toLowerCase().includes(q) ||
        (product.sku || "").toLowerCase().includes(q)
    );
  }, [products, searchTerm]);

  const selectedCustomer = customers.find((customer) => customer.id === selectedCustomerId);

  const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  const addToCart = (product: Product) => {
    setCart((prev) => {
      const existingItem = prev.find((item) => item.id === product.id);
      if (existingItem) {
        if (existingItem.quantity >= product.stock) return prev;
        return prev.map((item) =>
          item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, { ...product, quantity: 1 }];
    });
  };

  const removeFromCart = (id: string) => {
    setCart((prev) => prev.filter((item) => item.id !== id));
  };

  const updateQuantity = (id: string, quantity: number) => {
    const product = products.find((item) => item.id === id);
    if (!product) return;
    if (quantity <= 0) {
      removeFromCart(id);
      return;
    }
    setCart((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, quantity: Math.min(quantity, product.stock) } : item
      )
    );
  };

  const validateCustomer = () => {
    const dni = newCustomerData.dni.trim();
    if (!newCustomerData.name.trim()) return "Ingresa el nombre del cliente.";
    if (!/^\d{8}$/.test(dni)) return "El DNI debe tener 8 numeros.";
    if (newCustomerData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newCustomerData.email)) {
      return "Ingresa un correo valido.";
    }
    if (!validatePhone(normalizePhone(newCustomerData.phone))) {
      return "Telefono invalido. Ingresa un celular de 9 digitos que empiece con 9.";
    }
    if (customers.some((customer) => customer.dni === dni)) return "Ya existe un cliente con ese DNI.";
    return "";
  };

  const addCustomer = () => {
    const error = validateCustomer();
    if (error) {
      setFormError(error);
      return;
    }

    const customer: Customer = {
      id: crypto.randomUUID(),
      name: newCustomerData.name.trim(),
      dni: newCustomerData.dni.trim(),
      email: newCustomerData.email.trim(),
      phone: normalizePhone(newCustomerData.phone),
    };
    const nextCustomers = [...customers, customer];
    setCustomers(nextCustomers);
    saveCustomers(nextCustomers);
    setSelectedCustomerId(customer.id);
    setNewCustomerData({ name: "", dni: "", email: "", phone: "" });
    setShowCustomerForm(false);
    setFormError("");
  };

  const completeSale = async () => {
    if (selectedCustomer && !/^\d{8}$/.test(selectedCustomer.dni)) {
      setFormError("El cliente seleccionado no tiene un DNI valido.");
      return;
    }
    if (cart.length === 0) {
      setFormError("Agrega al menos un producto.");
      return;
    }

    setProcessing(true);
    setFormError("");

    const receiptNumber = generateReceiptNumber();
    const customerName = selectedCustomer?.name || "Cliente generico";
    const customerDni = selectedCustomer?.dni || "";
    const customerEmail = selectedCustomer?.email || "";
    const receiptData = {
      receiptNumber,
      date: new Date().toISOString(),
      customerName,
      customerDni: customerDni || undefined,
      customerEmail: customerEmail || undefined,
      items: cart,
      total,
      paymentMethod,
    };

    try {
      await processSale({
        receiptNumber,
        customerName,
        customerDni: customerDni || undefined,
        customerEmail: customerEmail || undefined,
        paymentMethod,
        items: cart.map((item) => ({
          productId: item.id,
          quantity: item.quantity,
          price: item.price,
        })),
      });

      setLastReceiptData({
        receiptNumber,
        total,
        itemCount: cart.reduce((sum, item) => sum + item.quantity, 0),
        customerName,
        customerDni,
        customerEmail,
        items: cart,
        paymentMethod,
      });

      generateReceiptPDF(receiptData);
      setShowConfirmation(true);
      setCart([]);
      setSelectedCustomerId("");
      setPaymentMethod("efectivo");

      const updated = await getProducts();
      setProducts(updated.filter((product) => product.stock > 0));
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Error al completar la venta.");
    } finally {
      setProcessing(false);
    }
  };

  const handleNewSale = () => {
    setShowConfirmation(false);
    setLastReceiptData(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="rounded-md bg-gradient-to-r from-pink-500 to-pink-600 p-3">
          <ShoppingBag className="h-6 w-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Crear nueva venta</h1>
          <p className="text-sm text-gray-500">Registra cliente, productos, metodo de pago y boleta.</p>
        </div>
      </div>

      {formError && (
        <div className="flex items-center gap-3 rounded-md border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-700">
          <AlertCircle className="h-5 w-5" />
          {formError}
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.25fr)_minmax(360px,0.75fr)]">
        <Card>
          <CardHeader>
            <CardTitle>Productos disponibles</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input
                placeholder="Buscar por nombre, SKU o categoria..."
                className="pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="grid max-h-[560px] gap-3 overflow-y-auto pr-1 md:grid-cols-2">
              {loading ? (
                <p className="py-6 text-center text-sm text-gray-500 md:col-span-2">Cargando productos...</p>
              ) : filteredProducts.length === 0 ? (
                <p className="py-6 text-center text-sm text-gray-500 md:col-span-2">Sin productos disponibles</p>
              ) : (
                filteredProducts.map((product) => {
                  const inCart = cart.find((item) => item.id === product.id);
                  return (
                    <div key={product.id} className="rounded-md border border-gray-200 bg-white p-4 shadow-sm transition hover:border-pink-200 hover:bg-pink-50/30">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-gray-800">{product.name}</p>
                          <p className="text-xs text-gray-500">{product.category} - Stock: {product.stock}</p>
                          <p className="mt-2 text-lg font-bold text-pink-700">S/. {product.price.toFixed(2)}</p>
                        </div>
                        <Button type="button" size="sm" onClick={() => addToCart(product)}>
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                      {inCart && (
                        <p className="mt-3 rounded-md bg-pink-100 px-2 py-1 text-xs font-semibold text-pink-700">
                          En carrito: {inCart.quantity}
                        </p>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Cliente</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {customers.length === 0 ? (
                <div className="flex items-center gap-3 rounded-md border border-dashed border-pink-300 bg-pink-50 p-4 text-pink-700">
                  <UserX className="h-6 w-6 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-bold">No hay clientes registrados</p>
                    <p className="text-xs">Puedes vender sin cliente o registrar uno aqui mismo.</p>
                  </div>
                </div>
              ) : (
                <select
                  value={selectedCustomerId}
                  onChange={(e) => setSelectedCustomerId(e.target.value)}
                  className="w-full rounded-md border border-gray-200 bg-white p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-pink-400"
                >
                  <option value="">Seleccionar cliente...</option>
                  {customers.map((customer) => (
                    <option key={customer.id} value={customer.id}>
                      {customer.name} - DNI {customer.dni}
                    </option>
                  ))}
                </select>
              )}

              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => setShowCustomerForm((value) => !value)}
              >
                <UserPlus className="mr-2 h-4 w-4" />
                Registrar cliente
              </Button>

              {showCustomerForm && (
                <div className="space-y-2 rounded-md border border-pink-100 bg-pink-50/60 p-3">
                  <Input
                    placeholder="Nombre completo"
                    value={newCustomerData.name}
                    onChange={(e) => setNewCustomerData({ ...newCustomerData, name: e.target.value })}
                  />
                  <Input
                    inputMode="numeric"
                    maxLength={8}
                    placeholder="DNI (8 numeros)"
                    value={newCustomerData.dni}
                    onChange={(e) =>
                      setNewCustomerData({ ...newCustomerData, dni: e.target.value.replace(/\D/g, "") })
                    }
                  />
                  <Input
                    type="email"
                    placeholder="Correo opcional"
                    value={newCustomerData.email}
                    onChange={(e) => setNewCustomerData({ ...newCustomerData, email: e.target.value })}
                  />
                  <Input
                    placeholder="Telefono opcional"
                    value={newCustomerData.phone}
                    inputMode="numeric"
                    maxLength={9}
                    onChange={(e) => setNewCustomerData({ ...newCustomerData, phone: normalizePhone(e.target.value) })}
                  />
                  {newCustomerData.phone && !validatePhone(newCustomerData.phone) && (
                    <p className="text-xs font-medium text-red-600">Debe tener 9 digitos y empezar con 9.</p>
                  )}
                  <Button type="button" size="sm" onClick={addCustomer} className="w-full">
                    Guardar cliente
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Carrito ({cart.length})</CardTitle>
            </CardHeader>
            <CardContent className="max-h-72 space-y-3 overflow-y-auto">
              {cart.length === 0 ? (
                <p className="py-6 text-center text-sm text-gray-500">Agrega productos para vender</p>
              ) : (
                cart.map((item) => (
                  <div key={item.id} className="rounded-md border border-gray-200 p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold">{item.name}</p>
                        <p className="text-xs text-gray-500">S/. {item.price.toFixed(2)} c/u</p>
                      </div>
                      <Button type="button" variant="ghost" size="sm" onClick={() => removeFromCart(item.id)}>
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                    <div className="mt-3 flex items-center justify-between">
                      <div className="flex items-center gap-1">
                        <Button type="button" variant="outline" size="sm" onClick={() => updateQuantity(item.id, item.quantity - 1)}>
                          <Minus className="h-3 w-3" />
                        </Button>
                        <Input
                          type="number"
                          min={1}
                          max={item.stock}
                          value={item.quantity}
                          onChange={(e) => updateQuantity(item.id, Number(e.target.value))}
                          className="h-9 w-16 text-center"
                        />
                        <Button type="button" variant="outline" size="sm" onClick={() => updateQuantity(item.id, item.quantity + 1)}>
                          <Plus className="h-3 w-3" />
                        </Button>
                      </div>
                      <span className="text-sm font-bold text-pink-700">S/. {(item.price * item.quantity).toFixed(2)}</span>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
            <CardFooter className="flex flex-col gap-4">
              <div className="w-full border-t pt-3">
                <p className="text-right text-sm text-gray-500">Total</p>
                <p className="text-right text-3xl font-bold text-gray-900">S/. {total.toFixed(2)}</p>
              </div>

              <PaymentMethodSelector
                selectedMethod={paymentMethod}
                onMethodChange={(method) => setPaymentMethod(method as PaymentMethod)}
                total={total}
              />

              <Button
                type="button"
                onClick={completeSale}
                disabled={cart.length === 0 || processing}
                className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700"
                size="lg"
              >
                <Check className="mr-2 h-4 w-4" />
                {processing ? "Procesando..." : "Completar venta"}
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>

      <SaleConfirmationModal
        isOpen={showConfirmation}
        receiptNumber={lastReceiptData?.receiptNumber || ""}
        total={lastReceiptData?.total || 0}
        itemCount={lastReceiptData?.itemCount || 0}
        customerName={lastReceiptData?.customerName || ""}
        paymentMethod={lastReceiptData?.paymentMethod}
        onDownloadPDF={() => {
          if (!lastReceiptData) return;
          generateReceiptPDF({
            receiptNumber: lastReceiptData.receiptNumber,
            date: new Date().toISOString(),
            customerName: lastReceiptData.customerName,
            customerDni: lastReceiptData.customerDni,
            customerEmail: lastReceiptData.customerEmail,
            items: lastReceiptData.items,
            total: lastReceiptData.total,
            paymentMethod: lastReceiptData.paymentMethod,
          });
        }}
        onClose={() => setShowConfirmation(false)}
        onNewSale={handleNewSale}
      />
    </div>
  );
}
