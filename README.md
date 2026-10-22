# QuickBite – Food Delivery

A multi-restaurant food delivery platform (like Swiggy / Zomato).

| Folder | What | Tech |
|---|---|---|
| [backend/](backend/) | REST API | Node.js, Express 5, TypeScript, PostgreSQL (Prisma) |
| [frontend/](frontend/) | Website | React 19, Vite, TypeScript, Tailwind CSS, TanStack Query |

## Run it locally

You need two terminals.

**Terminal 1 – backend** (first time: copy `backend/.env.example` to `backend/.env` and fill it in)
```bash
cd backend
npm install
npm run db:migrate   # first time only
npm run db:seed      # first time only: demo data
npm run dev          # http://localhost:4000
```

**Terminal 2 – frontend**
```bash
cd frontend
npm install
npm run dev          # http://localhost:5173
```

Open http://localhost:5173. The frontend forwards `/api` calls to the backend.

Demo customer login: `customer@demo.local` / `Customer@12345`
(more demo logins in [backend/README.md](backend/README.md))

## Status

- ✅ Phase 1 backend: auth, restaurants, menu, cart, Cash on Delivery orders, admin approval
- ✅ Customer website: browse, search, menu, cart, checkout, order history and status, cancel
- ⏳ Owner dashboard and admin page (website)
- ⏳ Phase 2: Razorpay, riders, live tracking, reviews, coupons
