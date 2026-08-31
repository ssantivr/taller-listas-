// main.ts
// Application entry point. Connects the list logic (OrderList) with the
// DOM and dynamically updates the interface.

import { OrderList, SortField, SearchField } from "./services/OrderList";
import {
  Order,
  OrderStatus,
  PaymentMethod,
  createOrder,
  orderTotal,
  formatCurrency,
} from "./models/Order";
import { Product } from "./models/Product";

const orderList = new OrderList();

// ---------------------------------------------------------------------
// Visual configuration for each board column
// ---------------------------------------------------------------------
interface ColumnConfig {
  status: OrderStatus;
  title: string;
  className: string;
  emptyEmoji: string;
}

const COLUMN_CONFIG: ColumnConfig[] = [
  { status: "requested", title: "📝 Requested", className: "col-requested", emptyEmoji: "📝" },
  { status: "kitchen", title: "👨‍🍳 In the kitchen", className: "col-kitchen", emptyEmoji: "👨‍🍳" },
  { status: "ready", title: "✅ Ready", className: "col-ready", emptyEmoji: "✅" },
  { status: "served", title: "🍽️ Served", className: "col-served", emptyEmoji: "🍽️" },
  { status: "checkout", title: "💰 At checkout", className: "col-checkout", emptyEmoji: "💰" },
  { status: "paid", title: "💳 Paid", className: "col-paid", emptyEmoji: "💳" },
];

// Remember the sort criterion chosen by the user for each column.
const sortByColumn: Record<OrderStatus, SortField> = {
  requested: "createdAt",
  kitchen: "createdAt",
  ready: "createdAt",
  served: "createdAt",
  checkout: "createdAt",
  paid: "createdAt",
};

// ---------------------------------------------------------------------
// Initial sample data (so the board doesn't start empty)
// ---------------------------------------------------------------------
function loadInitialData(): void {
  const o1 = createOrder("Santiago", 5, [
    { id: crypto.randomUUID(), name: "Burger", quantity: 2, unitPrice: 15000 },
    { id: crypto.randomUUID(), name: "Fries", quantity: 1, unitPrice: 8000 },
    { id: crypto.randomUUID(), name: "Soda", quantity: 2, unitPrice: 5000 },
  ]);
  const o2 = createOrder("Carlos", 2, [
    { id: crypto.randomUUID(), name: "Personal pizza", quantity: 1, unitPrice: 22000 },
  ]);
  const o3 = createOrder("Valentina", 8, [
    { id: crypto.randomUUID(), name: "Caesar salad", quantity: 1, unitPrice: 18000 },
    { id: crypto.randomUUID(), name: "Lemonade", quantity: 1, unitPrice: 6000 },
  ]);

  orderList.addOrder(o1);
  orderList.addOrder(o2);
  orderList.addOrder(o3);

  // Move a couple of orders to show the board in different states.
  orderList.advanceOrder(o2.id); // Carlos -> kitchen
  orderList.advanceOrder(o1.id); // Santiago -> kitchen
  orderList.advanceOrder(o1.id); // Santiago -> ready
}

// ---------------------------------------------------------------------
// Rendering of the top summary
// ---------------------------------------------------------------------
function renderSummary(): void {
  const panel = document.getElementById("summary-panel")!;
  const count = orderList.countAll();
  panel.innerHTML = COLUMN_CONFIG.map((column) => {
    return `
      <div class="summary-item" style="--color-stage: var(--st-${column.status})">
        <div class="count">${count[column.status]}</div>
        <div class="label">${column.title}</div>
      </div>
    `;
  }).join("");
}

// ---------------------------------------------------------------------
// Rendering of the full board (the 6 lists / columns)
// ---------------------------------------------------------------------
function renderBoard(): void {
  const board = document.getElementById("board")!;
  board.innerHTML = "";

  for (const column of COLUMN_CONFIG) {
    const columnElement = document.createElement("div");
    columnElement.className = `column ${column.className}`;

    const count = orderList.countOrders(column.status);

    columnElement.innerHTML = `
      <div class="column-header">
        <h3>${column.title}</h3>
        <span class="count">${count} ${count === 1 ? "order" : "orders"}</span>
      </div>
      <div class="column-sort">
        <label style="font-size:0.7rem;color:#6b7280;">Sort:</label>
        <select data-status="${column.status}" class="sort-select">
          <option value="createdAt">Time</option>
          <option value="id">Number</option>
          <option value="customer">Customer</option>
          <option value="table">Table</option>
        </select>
      </div>
      <div class="column-body" id="body-${column.status}"></div>
    `;

    board.appendChild(columnElement);

    const select = columnElement.querySelector<HTMLSelectElement>(".sort-select")!;
    select.value = sortByColumn[column.status];
    select.addEventListener("change", () => {
      sortByColumn[column.status] = select.value as SortField;
      renderColumn(column.status);
    });

    renderColumn(column.status);
  }
}

// Renders only the body of a specific column (list).
function renderColumn(status: OrderStatus): void {
  const body = document.getElementById(`body-${status}`)!;
  const config = COLUMN_CONFIG.find((c) => c.status === status)!;

  if (orderList.isEmpty(status)) {
    body.innerHTML = `
      <div class="empty-list">
        <span class="emoji">${config.emptyEmoji}</span>
        No orders at this stage.<br />New orders will appear here.
      </div>
    `;
    return;
  }

  const sortedOrders = orderList.getSortedList(
    status,
    sortByColumn[status],
    "asc"
  );

  body.innerHTML = sortedOrders.map((order) => renderCard(order)).join("");

  // Wire up the buttons on each newly created card.
  for (const order of sortedOrders) {
    const card = document.getElementById(`card-${order.id}`);
    if (!card) continue;

    card.querySelector<HTMLButtonElement>(".action-advance")?.addEventListener("click", () => {
      if (order.status === "served") {
        // "Request the bill" needs no extra data, advances directly.
        orderList.advanceOrder(order.id);
        updateUI();
      } else if (order.status === "checkout") {
        openPaymentModal(order);
      } else {
        orderList.advanceOrder(order.id);
        updateUI();
      }
    });

    card.querySelector<HTMLButtonElement>(".action-edit")?.addEventListener("click", () => {
      openEditModal(order);
    });

    card.querySelector<HTMLButtonElement>(".action-delete")?.addEventListener("click", () => {
      const confirmed = window.confirm(
        `Are you sure you want to delete order #${order.id} (Table ${order.table})?`
      );
      if (confirmed) {
        orderList.removeOrder(order.id);
        updateUI();
      }
    });
  }
}

// Text of the main button depending on the order's current status.
function advanceButtonText(status: OrderStatus): string {
  switch (status) {
    case "requested":
      return "Send to kitchen";
    case "kitchen":
      return "Mark as ready";
    case "ready":
      return "Serve order";
    case "served":
      return "Request the bill";
    case "checkout":
      return "Record payment";
    case "paid":
      return "";
  }
}

// Builds the HTML for an order card.
function renderCard(order: Order): string {
  const productList = order.products
    .map((p) => `${p.quantity}x ${p.name}`)
    .join(", ");

  const total = orderTotal(order);
  const button = advanceButtonText(order.status);

  const extraDetail =
    order.status === "paid" && order.paymentMethod
      ? `<div class="products">Payment: ${order.paymentMethod}</div>`
      : "";

  const editButtons =
    order.status === "requested"
      ? `<button class="btn-secondary btn-small action-edit">Edit</button>`
      : "";

  return `
    <div class="order-card" id="card-${order.id}">
      <div class="title-row">
        <span>Order #${order.id}</span>
        <span>Table ${order.table}</span>
      </div>
      <div class="customer">${order.customer}</div>
      <div class="products">${productList}</div>
      ${extraDetail}
      <div class="total">${formatCurrency(total)}</div>
      <div class="actions">
        ${editButtons}
        ${button ? `<button class="btn-primary btn-small action-advance">${button}</button>` : ""}
        <button class="btn-danger btn-small action-delete">Delete</button>
      </div>
    </div>
  `;
}

// Redraws everything (summary + full board).
function updateUI(): void {
  renderSummary();
  renderBoard();
}

// ---------------------------------------------------------------------
// Modal: New order
// ---------------------------------------------------------------------
function createProductRow(container: HTMLElement): void {
  const row = document.createElement("div");
  row.className = "product-row";
  row.innerHTML = `
    <input type="text" placeholder="Product" class="product-name" required />
    <input type="number" placeholder="Qty." min="1" value="1" class="product-quantity" required />
    <input type="number" placeholder="Price" min="0" class="product-price" required />
    <button type="button" class="btn-danger btn-small remove-product">✕</button>
  `;
  row.querySelector<HTMLButtonElement>(".remove-product")!.addEventListener("click", () => {
    row.remove();
  });
  container.appendChild(row);
}

function readProductsFromContainer(container: HTMLElement): Product[] {
  const rows = Array.from(container.querySelectorAll<HTMLElement>(".product-row"));
  return rows.map((row) => {
    const name = row.querySelector<HTMLInputElement>(".product-name")!.value.trim();
    const quantity = Number(row.querySelector<HTMLInputElement>(".product-quantity")!.value);
    const unitPrice = Number(row.querySelector<HTMLInputElement>(".product-price")!.value);
    return { id: crypto.randomUUID(), name, quantity, unitPrice };
  }).filter((p) => p.name.length > 0);
}

function setupNewOrderModal(): void {
  const overlay = document.getElementById("overlay-new")!;
  const form = document.getElementById("form-new-order") as HTMLFormElement;
  const productsContainer = document.getElementById("no-products")!;

  document.getElementById("btn-new-order")!.addEventListener("click", () => {
    form.reset();
    productsContainer.innerHTML = "";
    createProductRow(productsContainer);
    overlay.classList.remove("hidden");
  });

  document.getElementById("no-add-product")!.addEventListener("click", () => {
    createProductRow(productsContainer);
  });

  document.getElementById("no-cancel")!.addEventListener("click", () => {
    overlay.classList.add("hidden");
  });

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const customer = (document.getElementById("no-customer") as HTMLInputElement).value.trim();
    const table = Number((document.getElementById("no-table") as HTMLInputElement).value);
    const products = readProductsFromContainer(productsContainer);

    if (!customer || !table || products.length === 0) {
      window.alert("Fill in the customer, the table, and at least one product.");
      return;
    }

    const newOrder = createOrder(customer, table, products);
    orderList.addOrder(newOrder);
    overlay.classList.add("hidden");
    updateUI();
  });
}

// ---------------------------------------------------------------------
// Modal: Edit order
// ---------------------------------------------------------------------
function openEditModal(order: Order): void {
  const overlay = document.getElementById("overlay-edit")!;
  (document.getElementById("eo-id") as HTMLInputElement).value = order.id;
  (document.getElementById("eo-customer") as HTMLInputElement).value = order.customer;
  (document.getElementById("eo-table") as HTMLInputElement).value = String(order.table);

  const productsContainer = document.getElementById("eo-products")!;
  productsContainer.innerHTML = "";
  for (const product of order.products) {
    createProductRow(productsContainer);
    const rows = productsContainer.querySelectorAll<HTMLElement>(".product-row");
    const lastRow = rows[rows.length - 1];
    lastRow.querySelector<HTMLInputElement>(".product-name")!.value = product.name;
    lastRow.querySelector<HTMLInputElement>(".product-quantity")!.value = String(product.quantity);
    lastRow.querySelector<HTMLInputElement>(".product-price")!.value = String(product.unitPrice);
  }

  overlay.classList.remove("hidden");
}

function setupEditOrderModal(): void {
  const overlay = document.getElementById("overlay-edit")!;
  const form = document.getElementById("form-edit-order") as HTMLFormElement;
  const productsContainer = document.getElementById("eo-products")!;

  document.getElementById("eo-add-product")!.addEventListener("click", () => {
    createProductRow(productsContainer);
  });

  document.getElementById("eo-cancel")!.addEventListener("click", () => {
    overlay.classList.add("hidden");
  });

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const id = (document.getElementById("eo-id") as HTMLInputElement).value;
    const customer = (document.getElementById("eo-customer") as HTMLInputElement).value.trim();
    const table = Number((document.getElementById("eo-table") as HTMLInputElement).value);
    const products = readProductsFromContainer(productsContainer);

    if (!customer || !table || products.length === 0) {
      window.alert("Fill in the customer, the table, and at least one product.");
      return;
    }

    orderList.updateCustomerTable(id, customer, table);
    orderList.updateProducts(id, products);
    overlay.classList.add("hidden");
    updateUI();
  });
}

// ---------------------------------------------------------------------
// Modal: Record payment
// ---------------------------------------------------------------------
function openPaymentModal(order: Order): void {
  const overlay = document.getElementById("overlay-payment")!;
  (document.getElementById("payment-id") as HTMLInputElement).value = order.id;

  const total = orderTotal(order);
  const detail = document.getElementById("payment-detail")!;
  const productRows = order.products
    .map((p) => `<div class="total-line" style="font-weight:400;border:none;padding:2px 0;">
        <span>${p.quantity}x ${p.name}</span>
        <span>${formatCurrency(p.quantity * p.unitPrice)}</span>
      </div>`)
    .join("");

  detail.innerHTML = `
    <p><strong>Order #${order.id}</strong> — Table ${order.table} — ${order.customer}</p>
    ${productRows}
    <div class="total-line">
      <span>TOTAL</span>
      <span>${formatCurrency(total)}</span>
    </div>
  `;

  overlay.classList.remove("hidden");
}

function setupPaymentModal(): void {
  const overlay = document.getElementById("overlay-payment")!;

  document.getElementById("payment-cancel")!.addEventListener("click", () => {
    overlay.classList.add("hidden");
  });

  document.getElementById("payment-confirm")!.addEventListener("click", () => {
    const id = (document.getElementById("payment-id") as HTMLInputElement).value;
    const selectedMethod = document.querySelector<HTMLInputElement>(
      'input[name="payment-method"]:checked'
    )!.value as PaymentMethod;

    orderList.advanceOrder(id, selectedMethod);
    overlay.classList.add("hidden");
    updateUI();
  });
}

// ---------------------------------------------------------------------
// Modal: Search order
// ---------------------------------------------------------------------
function setupSearchModal(): void {
  const overlay = document.getElementById("overlay-search")!;
  const results = document.getElementById("sr-results")!;

  document.getElementById("btn-search")!.addEventListener("click", () => {
    (document.getElementById("sr-value") as HTMLInputElement).value = "";
    results.innerHTML = "";
    overlay.classList.remove("hidden");
  });

  document.getElementById("sr-close")!.addEventListener("click", () => {
    overlay.classList.add("hidden");
  });

  document.getElementById("sr-search-btn")!.addEventListener("click", () => {
    const field = (document.getElementById("sr-field") as HTMLSelectElement).value as SearchField;
    const value = (document.getElementById("sr-value") as HTMLInputElement).value.trim();

    if (!value) {
      results.innerHTML = `<p class="no-results">Type a value to search for.</p>`;
      return;
    }

    const found = orderList.searchBy(field, value);

    if (found.length === 0) {
      results.innerHTML = `<p class="no-results">No orders found.</p>`;
      return;
    }

    results.innerHTML = found.map((order) => renderCard(order)).join("");
  });
}

// ---------------------------------------------------------------------
// Application startup
// ---------------------------------------------------------------------
function init(): void {
  loadInitialData();
  setupNewOrderModal();
  setupEditOrderModal();
  setupPaymentModal();
  setupSearchModal();
  updateUI();
}

document.addEventListener("DOMContentLoaded", init);
