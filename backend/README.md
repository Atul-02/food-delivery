# Food Delivery – Backend API

Node.js + Express 5 + TypeScript + PostgreSQL (Prisma).

## Setup

```bash
cd backend
npm install
cp .env.example .env        # then fill in DATABASE_URL and JWT_ACCESS_SECRET
npm run db:migrate          # creates the tables
npm run db:seed             # demo admin, owner, customer, 2 restaurants
npm run dev                 # http://localhost:4000
```

Demo logins after seeding:

| Role | Email | Password |
|---|---|---|
| Admin | admin@fooddelivery.local | Admin@12345 |
| Owner | owner@demo.local | Owner@12345 |
| Customer | customer@demo.local | Customer@12345 |

## Conventions

- All routes are under `/api/v1`.
- Auth: send `Authorization: Bearer <accessToken>`. Access tokens last 15 min; call `/auth/refresh` with the refresh token to get a new pair.
- **Money is in paise** (integer). `24000` = Rs 240.
- Errors look like `{ "error": "message", "details": ... }`.
- Lists are paginated: `?page=1&limit=20` returns `{ items, page, limit, total, totalPages }`.

## Endpoints (Phase 1)

### Auth
| Method | Path | Body |
|---|---|---|
| POST | /auth/register | name, email, password, phone?, role? (CUSTOMER / RESTAURANT_OWNER / RIDER) |
| POST | /auth/login | email, password |
| POST | /auth/refresh | refreshToken |
| POST | /auth/logout | refreshToken |

### Users (logged in)
| Method | Path |
|---|---|
| GET / PATCH | /users/me |
| GET / POST | /users/me/addresses |
| PATCH / DELETE | /users/me/addresses/:id |

### Restaurants (public)
| Method | Path |
|---|---|
| GET | /restaurants?search=&cuisine=&city=&page=&limit= |
| GET | /restaurants/:id |
| GET | /restaurants/:id/menu |
| GET | /restaurants/:id/reviews |

### Restaurant owner (role RESTAURANT_OWNER)
| Method | Path |
|---|---|
| GET / POST | /owner/restaurants |
| PATCH | /owner/restaurants/:id |
| PATCH | /owner/restaurants/:id/status — `{ isOpen }` |
| GET | /owner/restaurants/:id/menu |
| POST | /owner/restaurants/:id/categories |
| PATCH / DELETE | /owner/categories/:categoryId |
| POST | /owner/restaurants/:id/items |
| PATCH / DELETE | /owner/items/:itemId |
| GET | /owner/restaurants/:id/orders?status= |
| PATCH | /owner/orders/:orderId/status — `{ status: ACCEPTED / REJECTED / PREPARING / READY_FOR_PICKUP }` |

### Cart (role CUSTOMER)
| Method | Path |
|---|---|
| GET | /cart |
| POST | /cart/items — `{ menuItemId, quantity?, replaceCart? }` |
| PATCH | /cart/items/:menuItemId — `{ quantity }` (0 removes) |
| DELETE | /cart/items/:menuItemId |
| DELETE | /cart |

Adding an item from a different restaurant returns `409` with `details.code = CART_RESTAURANT_MISMATCH`. Retry with `replaceCart: true` to clear the old cart.

### Orders (role CUSTOMER)
| Method | Path |
|---|---|
| POST | /orders — `{ addressId, paymentMethod: "COD", notes? }` |
| GET | /orders |
| GET | /orders/:id |
| POST | /orders/:id/cancel (only while PLACED or ACCEPTED) |

### Admin (role ADMIN)
| Method | Path |
|---|---|
| GET | /admin/restaurants?approved=true/false |
| PATCH | /admin/restaurants/:id/approval — `{ isApproved }` |

## Order flow

```
PLACED → ACCEPTED → PREPARING → READY_FOR_PICKUP → PICKED_UP → DELIVERED
   ↘ REJECTED (restaurant)   ↘ CANCELLED (customer, before PREPARING)
```

## Coming in Phase 2
Razorpay online payment, rider endpoints (pick orders from a list), live tracking with Socket.IO, reviews, coupons.
