import type { Promotion } from "@/frontend/lib/dashboard/api";

// Producto minimo necesario para calcular un descuento.
export type PricedProduct = {
  id: string;
  category: string;
  price: number;
};

export type AppliedPromotion = {
  promo: Promotion;
  originalUnitPrice: number;
  discountedUnitPrice: number;
  unitDiscount: number;
  label: string;
};

// Etiqueta legible del descuento: "20%" o "S/. 10.00".
export const promotionLabel = (promo: Promotion): string =>
  promo.discountType === "PERCENTAGE"
    ? `${promo.discountValue}%`
    : `S/. ${promo.discountValue.toFixed(2)}`;

const isPromotionValidNow = (promo: Promotion, now: Date): boolean => {
  if (!promo.isActive) return false;
  const start = new Date(promo.startDate);
  const end = new Date(promo.endDate);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return false;
  return start <= now && now <= end;
};

const promotionAppliesTo = (promo: Promotion, product: PricedProduct): boolean => {
  if (promo.productId) return promo.productId === product.id;
  if (promo.category) return promo.category === product.category;
  return true; // sin producto ni categoria => toda la tienda
};

const priceAfterPromotion = (promo: Promotion, price: number): number => {
  if (promo.discountType === "PERCENTAGE") {
    const pct = Math.min(100, Math.max(0, promo.discountValue));
    return Math.max(0, price * (1 - pct / 100));
  }
  return Math.max(0, price - Math.max(0, promo.discountValue));
};

// Devuelve la mejor promocion vigente (mayor descuento por unidad) o null.
export const getBestPromotionForProduct = (
  product: PricedProduct,
  promotions: Promotion[],
  now: Date = new Date()
): AppliedPromotion | null => {
  let best: AppliedPromotion | null = null;

  for (const promo of promotions) {
    if (!isPromotionValidNow(promo, now)) continue;
    if (!promotionAppliesTo(promo, product)) continue;

    const discountedUnitPrice = priceAfterPromotion(promo, product.price);
    const unitDiscount = product.price - discountedUnitPrice;
    if (unitDiscount <= 0) continue;

    if (!best || unitDiscount > best.unitDiscount) {
      best = {
        promo,
        originalUnitPrice: product.price,
        discountedUnitPrice,
        unitDiscount,
        label: promotionLabel(promo),
      };
    }
  }

  return best;
};
