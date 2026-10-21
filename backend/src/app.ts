import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { env } from './config/env';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { authRouter } from './modules/auth/auth.routes';
import { usersRouter } from './modules/users/users.routes';
import { restaurantsRouter } from './modules/restaurants/restaurants.routes';
import { ownerRouter } from './modules/owner/owner.routes';
import { cartRouter } from './modules/cart/cart.routes';
import { ordersRouter } from './modules/orders/orders.routes';
import { adminRouter } from './modules/admin/admin.routes';

export const app = express();

app.use(helmet());
app.use(cors({ origin: env.CORS_ORIGIN.split(',').map((o) => o.trim()), credentials: true }));
app.use(express.json({ limit: '1mb' }));

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

const api = express.Router();
api.use('/auth', authRouter);
api.use('/users', usersRouter);
api.use('/restaurants', restaurantsRouter);
api.use('/owner', ownerRouter);
api.use('/cart', cartRouter);
api.use('/orders', ordersRouter);
api.use('/admin', adminRouter);

app.use('/api/v1', api);

app.use(notFoundHandler);
app.use(errorHandler);
