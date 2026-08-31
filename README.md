# 🍽️ Order Manager — Restaurant

A **Lists** workshop applied to a real case study: the order-service
process of a restaurant, built in **TypeScript**.

## Workshop concept

Each order is an item that lives inside a list and moves through six
independent lists that represent each stage of the process (see
`src/services/OrderList.ts`):

```
requestedOrders → kitchenOrders → readyOrders
→ servedOrders → checkoutOrders → paidOrders
```

Moving an order from one stage to another is, literally, **removing** it
from one list and **adding** it to the next (the `advanceOrder` method).

## Project structure

```
Restaurant-Order-List-Workshop
├── index.html
├── src
│   ├── main.ts                 # Interface logic (DOM)
│   ├── models
│   │   ├── Order.ts             # Order model + calculation functions
│   │   └── Product.ts           # Product model
│   ├── services
│   │   └── OrderList.ts         # The 6 lists and all operations
│   └── styles
│       └── styles.css
├── dist                         # Already compiled code (ready to use)
├── package.json
└── tsconfig.json
```

## How to run it

**Quick option (nothing to install):** the project already comes compiled
in `dist/bundle.js`. Just open `index.html` in the browser (double-click)
and it works.

**To edit the TypeScript code and recompile:**

```bash
npm install
npm run bundle   # generates dist/bundle.js from src/*.ts
```

(`npm run build` also generates a modular version in `dist/` with `tsc`,
useful for reviewing the equivalent JS of each `.ts` file.)

## Implemented list operations

1. Add order (**+ NEW ORDER** button)
2. Remove order (with confirmation)
3. Modify order (customer, table, and products)
4. Search order (by number, customer, table, or status)
5. Sort orders (sort each column by number, customer, table, or time)
6. Move orders between lists (action buttons on each card)
7. Calculate total (automatic, based on the products)
8. Record payment (cash, card, or transfer)
9. Count orders (counter on each column and in the top summary)
10. Detect empty lists (illustrated message when a list has no orders)
