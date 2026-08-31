
import { Product, productSubtotal } from "./Product";

export type OrderStatus =
  | "requested"
  | "kitchen"
  | "ready"
  | "served"
  | "checkout"
  | "paid";

export type PaymentMethod = "Cash" | "Card" | "Transfer";

export interface Order {
  id: string;               // E.g.: "001"
  customer: string;
  table: number;
  products: Product[];
  status: OrderStatus;
  createdAt: Date;
  paymentMethod?: PaymentMethod;
  paidAt?: Date;
}

let orderCounter = 0;

// Generates an incremental identifier with format "001", "002", ...
export function generateOrderId(): string {
  orderCounter += 1;
  return orderCounter.toString().padStart(3, "0");
}

// Creates a new order with "requested" status.
export function createOrder(
  customer: string,
  table: number,
  products: Product[]
): Order {
  return {
    id: generateOrderId(),
    customer,
    table,
    products,
    status: "requested",
    createdAt: new Date(),
  };
}

// Calculates the total of an order by summing the subtotal of each product.
export function orderTotal(order: Order): number {
  return order.products.reduce(
    (accumulated, product) => accumulated + productSubtotal(product),
    0
  );
}

// Formats a numeric value as currency (COP, no decimals).
export function formatCurrency(value: number): string {
  return "$" + Math.round(value).toLocaleString("en-US");
}
