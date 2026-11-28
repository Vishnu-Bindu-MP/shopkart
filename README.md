# Shopkart

A backend for an online shopping app, built to learn how real e-commerce APIs work.
Customers can browse products, sign up, log in, fill a cart, apply promo codes and
place orders. Live demo: coming soon (will be hosted on Render with a Neon database).

## Tech stack

- Node.js and Express
- PostgreSQL (hosted on Neon)
- JWT authentication and bcrypt password hashing
- Jest and Supertest for automated tests

## Features

- Product catalogue with validation and proper status codes
- Signup and login with hashed passwords and JWT tokens
- Cart: add, change quantity, remove, and view totals
- Promo codes with rules: validity dates, usage limits, minimum order, percentage or fixed discount
- Checkout inside a database transaction: stock is locked, reduced, and rolled back on any failure
- Order history, with the price and discount saved at purchase time

## API

| Method | Path | Auth | What it does |
|---|---|---|---|
| GET | /api/products | No | List products |
| GET | /api/products/:id | No | One product |
| POST | /api/products | Yes | Create a product |
| POST | /api/auth/signup | No | Create an account |
| POST | /api/auth/login | No | Log in, returns a token |
| GET | /api/auth/me | Yes | Who am I |
| GET | /api/cart | Yes | View the cart with totals |
| POST | /api/cart/items | Yes | Add an item (adds to the quantity if it exists) |
| PUT | /api/cart/items/:productId | Yes | Set an item's quantity |
| DELETE | /api/cart/items/:productId | Yes | Remove an item |
| POST | /api/cart/promo | Yes | Preview a promo code on the cart |
| POST | /api/orders | Yes | Check out, with an optional promoCode |
| GET | /api/orders | Yes | My orders |
| GET | /api/orders/:id | Yes | One of my orders |

Protected routes need the header `Authorization: Bearer <token>`.

## Project structure

```
routes/        match an address and method to a controller
controllers/   read the request, call a service, send the response
services/      business rules and database queries
middleware/    JWT check and central error handler
utils/         custom error classes with status codes
tests/         Jest and Supertest tests (database mocked)
```

## Design decisions

- **Layered structure** keeps rules in services, so they are easy to test and change.
- **Parameterised queries** (`$1`, `$2`) protect against SQL injection.
- **Checkout uses a transaction** with row locks, so stock cannot be oversold and a failed order leaves no partial changes.
- **Order items copy the unit price**, so past orders keep the price paid.
- **Login returns the same error** for a wrong email or a wrong password.

## Run it locally

1. Install Node.js and create a free Neon PostgreSQL database.
2. Copy `.env.example` to `.env` and fill in your values.
3. Create the tables by running the SQL in `schema.sql` (Neon's SQL Editor works), and optionally `seed.sql` for sample data.
4. Run:

```
npm install
npm start
npm test
```

## What I would add next

- Admin role, so only admins can create or edit products
- Pagination and search on the product list
- Order cancellation that restores stock
- Payment integration
- A React frontend (in progress)