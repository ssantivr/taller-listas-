
import { Order, OrderStatus, PaymentMethod } from "../models/Order";
import { Product } from "../models/Product";

// Order of the process flow; used to know which list to move an order to
// when it advances to the next stage.
const STATUS_FLOW: OrderStatus[] = [
  "requested",
  "kitchen",
  "ready",
  "served",
  "checkout",
  "paid",
];

export type SortField = "id" | "customer" | "table" | "status" | "createdAt";
export type SortDirection = "asc" | "desc";
export type SearchField = "id" | "customer" | "table" | "status";

export class OrderList {
  // Each status has its own independent LIST of orders.
  private lists: Record<OrderStatus, Order[]> = {
    requested: [],
    kitchen: [],
    ready: [],
    served: [],
    checkout: [],
    paid: [],
  };

  // ---------- 1. Add order ----------
  addOrder(order: Order): void {
    this.lists.requested.push(order);
  }

  // ---------- 2. Remove order ----------
  // Removes an order from whichever list it's in. Returns true if it was
  // removed successfully.
  removeOrder(id: string): boolean {
    for (const status of STATUS_FLOW) {
      const list = this.lists[status];
      const index = list.findIndex((o) => o.id === id);
      if (index !== -1) {
        list.splice(index, 1);
        return true;
      }
    }
    return false;
  }

  // ---------- 3. Modify order ----------
  // Allows replacing the products of an order (add/remove products).
  updateProducts(id: string, products: Product[]): boolean {
    const order = this.findById(id);
    if (!order) return false;
    order.products = products;
    return true;
  }

  updateCustomerTable(id: string, customer: string, table: number): boolean {
    const order = this.findById(id);
    if (!order) return false;
    order.customer = customer;
    order.table = table;
    return true;
  }

  // ---------- 4. Search order ----------
  findById(id: string): Order | undefined {
    for (const status of STATUS_FLOW) {
      const found = this.lists[status].find((o) => o.id === id);
      if (found) return found;
    }
    return undefined;
  }

  searchBy(field: SearchField, value: string): Order[] {
    const results: Order[] = [];
    const normalizedValue = value.toLowerCase().trim();
    for (const status of STATUS_FLOW) {
      for (const order of this.lists[status]) {
        let fieldValue: string;
        switch (field) {
          case "id":
            fieldValue = order.id;
            break;
          case "customer":
            fieldValue = order.customer;
            break;
          case "table":
            fieldValue = String(order.table);
            break;
          case "status":
            fieldValue = order.status;
            break;
        }
        if (fieldValue.toLowerCase().includes(normalizedValue)) {
          results.push(order);
        }
      }
    }
    return results;
  }

  // ---------- 5. Sort orders ----------
  // Returns a sorted copy of a specific list, without modifying the
  // original order of the internal list.
  getSortedList(
    status: OrderStatus,
    field: SortField,
    direction: SortDirection
  ): Order[] {
    const copy = [...this.lists[status]];
    copy.sort((a, b) => {
      let comparison = 0;
      switch (field) {
        case "id":
          comparison = a.id.localeCompare(b.id);
          break;
        case "customer":
          comparison = a.customer.localeCompare(b.customer);
          break;
        case "table":
          comparison = a.table - b.table;
          break;
        case "status":
          comparison = a.status.localeCompare(b.status);
          break;
        case "createdAt":
          comparison = a.createdAt.getTime() - b.createdAt.getTime();
          break;
      }
      return direction === "asc" ? comparison : -comparison;
    });
    return copy;
  }

  // ---------- 6. Move orders between lists ----------
  // Moves an order to the next stage in the flow: removes it from its
  // current list and adds it to the next list.
  advanceOrder(id: string, paymentMethod?: PaymentMethod): boolean {
    const currentStatusIndex = STATUS_FLOW.findIndex((status) =>
      this.lists[status].some((o) => o.id === id)
    );
    if (currentStatusIndex === -1) return false;
    if (currentStatusIndex === STATUS_FLOW.length - 1) return false; // already paid

    const currentStatus = STATUS_FLOW[currentStatusIndex];
    const nextStatus = STATUS_FLOW[currentStatusIndex + 1];

    const currentList = this.lists[currentStatus];
    const orderIndex = currentList.findIndex((o) => o.id === id);
    const [order] = currentList.splice(orderIndex, 1); // remove from the current list

    order.status = nextStatus;
    if (nextStatus === "paid") {
      order.paymentMethod = paymentMethod;
      order.paidAt = new Date();
    }

    this.lists[nextStatus].push(order); // add to the next list
    return true;
  }

  // ---------- 9. Count orders ----------
  countOrders(status: OrderStatus): number {
    return this.lists[status].length;
  }

  countAll(): Record<OrderStatus, number> {
    const count = {} as Record<OrderStatus, number>;
    for (const status of STATUS_FLOW) {
      count[status] = this.lists[status].length;
    }
    return count;
  }

  // ---------- 10. Detect empty lists ----------
  isEmpty(status: OrderStatus): boolean {
    return this.lists[status].length === 0;
  }

  getList(status: OrderStatus): Order[] {
    return this.lists[status];
  }

  getStatuses(): OrderStatus[] {
    return [...STATUS_FLOW];
  }
}
