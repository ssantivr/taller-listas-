"use strict";
(() => {
  // src/services/OrderList.ts
  var STATUS_FLOW = [
    "requested",
    "kitchen",
    "ready",
    "served",
    "checkout",
    "paid"
  ];
  var OrderList = class {
    constructor() {
      // Each status has its own independent LIST of orders.
      this.lists = {
        requested: [],
        kitchen: [],
        ready: [],
        served: [],
        checkout: [],
        paid: []
      };
    }
    // ---------- 1. Add order ----------
    addOrder(order) {
      this.lists.requested.push(order);
    }
    // ---------- 2. Remove order ----------
    // Removes an order from whichever list it's in. Returns true if it was
    // removed successfully.
    removeOrder(id) {
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
    updateProducts(id, products) {
      const order = this.findById(id);
      if (!order) return false;
      order.products = products;
      return true;
    }
    updateCustomerTable(id, customer, table) {
      const order = this.findById(id);
      if (!order) return false;
      order.customer = customer;
      order.table = table;
      return true;
    }
    // ---------- 4. Search order ----------
    findById(id) {
      for (const status of STATUS_FLOW) {
        const found = this.lists[status].find((o) => o.id === id);
        if (found) return found;
      }
      return void 0;
    }
    searchBy(field, value) {
      const results = [];
      const normalizedValue = value.toLowerCase().trim();
      for (const status of STATUS_FLOW) {
        for (const order of this.lists[status]) {
          let fieldValue;
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
    getSortedList(status, field, direction) {
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
    advanceOrder(id, paymentMethod) {
      const currentStatusIndex = STATUS_FLOW.findIndex(
        (status) => this.lists[status].some((o) => o.id === id)
      );
      if (currentStatusIndex === -1) return false;
      if (currentStatusIndex === STATUS_FLOW.length - 1) return false;
      const currentStatus = STATUS_FLOW[currentStatusIndex];
      const nextStatus = STATUS_FLOW[currentStatusIndex + 1];
      const currentList = this.lists[currentStatus];
      const orderIndex = currentList.findIndex((o) => o.id === id);
      const [order] = currentList.splice(orderIndex, 1);
      order.status = nextStatus;
      if (nextStatus === "paid") {
        order.paymentMethod = paymentMethod;
        order.paidAt = /* @__PURE__ */ new Date();
      }
      this.lists[nextStatus].push(order);
      return true;
    }
    // ---------- 9. Count orders ----------
    countOrders(status) {
      return this.lists[status].length;
    }
    countAll() {
      const count = {};
      for (const status of STATUS_FLOW) {
        count[status] = this.lists[status].length;
      }
      return count;
    }
    // ---------- 10. Detect empty lists ----------
    isEmpty(status) {
      return this.lists[status].length === 0;
    }
    getList(status) {
      return this.lists[status];
    }
    getStatuses() {
      return [...STATUS_FLOW];
    }
  };

  // src/models/Product.ts
  function productSubtotal(product) {
    return product.quantity * product.unitPrice;
  }

  // src/models/Order.ts
  var orderCounter = 0;
  function generateOrderId() {
    orderCounter += 1;
    return orderCounter.toString().padStart(3, "0");
  }
  function createOrder(customer, table, products) {
    return {
      id: generateOrderId(),
      customer,
      table,
      products,
      status: "requested",
      createdAt: /* @__PURE__ */ new Date()
    };
  }
  function orderTotal(order) {
    return order.products.reduce(
      (accumulated, product) => accumulated + productSubtotal(product),
      0
    );
  }
  function formatCurrency(value) {
    return "$" + Math.round(value).toLocaleString("en-US");
  }

  // src/main.ts
  var orderList = new OrderList();
  var COLUMN_CONFIG = [
    { status: "requested", title: "\u{1F4DD} Requested", className: "col-requested", emptyEmoji: "\u{1F4DD}" },
    { status: "kitchen", title: "\u{1F468}\u200D\u{1F373} In the kitchen", className: "col-kitchen", emptyEmoji: "\u{1F468}\u200D\u{1F373}" },
    { status: "ready", title: "\u2705 Ready", className: "col-ready", emptyEmoji: "\u2705" },
    { status: "served", title: "\u{1F37D}\uFE0F Served", className: "col-served", emptyEmoji: "\u{1F37D}\uFE0F" },
    { status: "checkout", title: "\u{1F4B0} At checkout", className: "col-checkout", emptyEmoji: "\u{1F4B0}" },
    { status: "paid", title: "\u{1F4B3} Paid", className: "col-paid", emptyEmoji: "\u{1F4B3}" }
  ];
  var sortByColumn = {
    requested: "createdAt",
    kitchen: "createdAt",
    ready: "createdAt",
    served: "createdAt",
    checkout: "createdAt",
    paid: "createdAt"
  };
  function loadInitialData() {
    const o1 = createOrder("Santiago", 5, [
      { id: crypto.randomUUID(), name: "Burger", quantity: 2, unitPrice: 15e3 },
      { id: crypto.randomUUID(), name: "Fries", quantity: 1, unitPrice: 8e3 },
      { id: crypto.randomUUID(), name: "Soda", quantity: 2, unitPrice: 5e3 }
    ]);
    const o2 = createOrder("Carlos", 2, [
      { id: crypto.randomUUID(), name: "Personal pizza", quantity: 1, unitPrice: 22e3 }
    ]);
    const o3 = createOrder("Valentina", 8, [
      { id: crypto.randomUUID(), name: "Caesar salad", quantity: 1, unitPrice: 18e3 },
      { id: crypto.randomUUID(), name: "Lemonade", quantity: 1, unitPrice: 6e3 }
    ]);
    orderList.addOrder(o1);
    orderList.addOrder(o2);
    orderList.addOrder(o3);
    orderList.advanceOrder(o2.id);
    orderList.advanceOrder(o1.id);
    orderList.advanceOrder(o1.id);
  }
  function renderSummary() {
    const panel = document.getElementById("summary-panel");
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
  function renderBoard() {
    const board = document.getElementById("board");
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
      const select = columnElement.querySelector(".sort-select");
      select.value = sortByColumn[column.status];
      select.addEventListener("change", () => {
        sortByColumn[column.status] = select.value;
        renderColumn(column.status);
      });
      renderColumn(column.status);
    }
  }
  function renderColumn(status) {
    const body = document.getElementById(`body-${status}`);
    const config = COLUMN_CONFIG.find((c) => c.status === status);
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
    for (const order of sortedOrders) {
      const card = document.getElementById(`card-${order.id}`);
      if (!card) continue;
      card.querySelector(".action-advance")?.addEventListener("click", () => {
        if (order.status === "served") {
          orderList.advanceOrder(order.id);
          updateUI();
        } else if (order.status === "checkout") {
          openPaymentModal(order);
        } else {
          orderList.advanceOrder(order.id);
          updateUI();
        }
      });
      card.querySelector(".action-edit")?.addEventListener("click", () => {
        openEditModal(order);
      });
      card.querySelector(".action-delete")?.addEventListener("click", () => {
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
  function advanceButtonText(status) {
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
  function renderCard(order) {
    const productList = order.products.map((p) => `${p.quantity}x ${p.name}`).join(", ");
    const total = orderTotal(order);
    const button = advanceButtonText(order.status);
    const extraDetail = order.status === "paid" && order.paymentMethod ? `<div class="products">Payment: ${order.paymentMethod}</div>` : "";
    const editButtons = order.status === "requested" ? `<button class="btn-secondary btn-small action-edit">Edit</button>` : "";
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
  function updateUI() {
    renderSummary();
    renderBoard();
  }
  function createProductRow(container) {
    const row = document.createElement("div");
    row.className = "product-row";
    row.innerHTML = `
    <input type="text" placeholder="Product" class="product-name" required />
    <input type="number" placeholder="Qty." min="1" value="1" class="product-quantity" required />
    <input type="number" placeholder="Price" min="0" class="product-price" required />
    <button type="button" class="btn-danger btn-small remove-product">\u2715</button>
  `;
    row.querySelector(".remove-product").addEventListener("click", () => {
      row.remove();
    });
    container.appendChild(row);
  }
  function readProductsFromContainer(container) {
    const rows = Array.from(container.querySelectorAll(".product-row"));
    return rows.map((row) => {
      const name = row.querySelector(".product-name").value.trim();
      const quantity = Number(row.querySelector(".product-quantity").value);
      const unitPrice = Number(row.querySelector(".product-price").value);
      return { id: crypto.randomUUID(), name, quantity, unitPrice };
    }).filter((p) => p.name.length > 0);
  }
  function setupNewOrderModal() {
    const overlay = document.getElementById("overlay-new");
    const form = document.getElementById("form-new-order");
    const productsContainer = document.getElementById("no-products");
    document.getElementById("btn-new-order").addEventListener("click", () => {
      form.reset();
      productsContainer.innerHTML = "";
      createProductRow(productsContainer);
      overlay.classList.remove("hidden");
    });
    document.getElementById("no-add-product").addEventListener("click", () => {
      createProductRow(productsContainer);
    });
    document.getElementById("no-cancel").addEventListener("click", () => {
      overlay.classList.add("hidden");
    });
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const customer = document.getElementById("no-customer").value.trim();
      const table = Number(document.getElementById("no-table").value);
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
  function openEditModal(order) {
    const overlay = document.getElementById("overlay-edit");
    document.getElementById("eo-id").value = order.id;
    document.getElementById("eo-customer").value = order.customer;
    document.getElementById("eo-table").value = String(order.table);
    const productsContainer = document.getElementById("eo-products");
    productsContainer.innerHTML = "";
    for (const product of order.products) {
      createProductRow(productsContainer);
      const rows = productsContainer.querySelectorAll(".product-row");
      const lastRow = rows[rows.length - 1];
      lastRow.querySelector(".product-name").value = product.name;
      lastRow.querySelector(".product-quantity").value = String(product.quantity);
      lastRow.querySelector(".product-price").value = String(product.unitPrice);
    }
    overlay.classList.remove("hidden");
  }
  function setupEditOrderModal() {
    const overlay = document.getElementById("overlay-edit");
    const form = document.getElementById("form-edit-order");
    const productsContainer = document.getElementById("eo-products");
    document.getElementById("eo-add-product").addEventListener("click", () => {
      createProductRow(productsContainer);
    });
    document.getElementById("eo-cancel").addEventListener("click", () => {
      overlay.classList.add("hidden");
    });
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const id = document.getElementById("eo-id").value;
      const customer = document.getElementById("eo-customer").value.trim();
      const table = Number(document.getElementById("eo-table").value);
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
  function openPaymentModal(order) {
    const overlay = document.getElementById("overlay-payment");
    document.getElementById("payment-id").value = order.id;
    const total = orderTotal(order);
    const detail = document.getElementById("payment-detail");
    const productRows = order.products.map((p) => `<div class="total-line" style="font-weight:400;border:none;padding:2px 0;">
        <span>${p.quantity}x ${p.name}</span>
        <span>${formatCurrency(p.quantity * p.unitPrice)}</span>
      </div>`).join("");
    detail.innerHTML = `
    <p><strong>Order #${order.id}</strong> \u2014 Table ${order.table} \u2014 ${order.customer}</p>
    ${productRows}
    <div class="total-line">
      <span>TOTAL</span>
      <span>${formatCurrency(total)}</span>
    </div>
  `;
    overlay.classList.remove("hidden");
  }
  function setupPaymentModal() {
    const overlay = document.getElementById("overlay-payment");
    document.getElementById("payment-cancel").addEventListener("click", () => {
      overlay.classList.add("hidden");
    });
    document.getElementById("payment-confirm").addEventListener("click", () => {
      const id = document.getElementById("payment-id").value;
      const selectedMethod = document.querySelector(
        'input[name="payment-method"]:checked'
      ).value;
      orderList.advanceOrder(id, selectedMethod);
      overlay.classList.add("hidden");
      updateUI();
    });
  }
  function setupSearchModal() {
    const overlay = document.getElementById("overlay-search");
    const results = document.getElementById("sr-results");
    document.getElementById("btn-search").addEventListener("click", () => {
      document.getElementById("sr-value").value = "";
      results.innerHTML = "";
      overlay.classList.remove("hidden");
    });
    document.getElementById("sr-close").addEventListener("click", () => {
      overlay.classList.add("hidden");
    });
    document.getElementById("sr-search-btn").addEventListener("click", () => {
      const field = document.getElementById("sr-field").value;
      const value = document.getElementById("sr-value").value.trim();
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
  function init() {
    loadInitialData();
    setupNewOrderModal();
    setupEditOrderModal();
    setupPaymentModal();
    setupSearchModal();
    updateUI();
  }
  document.addEventListener("DOMContentLoaded", init);
})();
