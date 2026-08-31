// Product.ts
// Represents a product requested within an order.

export interface Product {
  id: string;
  name: string;
  quantity: number;
  unitPrice: number;
}

// Calculates the subtotal of a product (quantity * unit price).
export function productSubtotal(product: Product): number {
  return product.quantity * product.unitPrice;
}
