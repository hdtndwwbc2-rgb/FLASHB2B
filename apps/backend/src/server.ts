import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { productsRouter } from './routes/products';
import { checkoutRouter } from './routes/checkout';
import { gptRouter } from './routes/gpt';
import { invitationsRouter } from './routes/invitations';
import { adminOrdersRouter } from './routes/admin/orders';
import { authWebhookRouter } from './routes/auth-webhook';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api/products', productsRouter);
app.use('/api/checkout', checkoutRouter);
app.use('/api/gpt', gptRouter);
app.use('/api/invitations', invitationsRouter);
app.use('/api/admin/orders', adminOrdersRouter);
app.use('/api/auth-webhook', authWebhookRouter);

app.get('/', (_req, res) => res.send('FLASHB2B backend running'));

const port = process.env.PORT || 4000;
app.listen(port, () => console.log(`Backend listening on http://localhost:${port}`));
