import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import swaggerUi from 'swagger-ui-express';
import swaggerJsdoc from 'swagger-jsdoc';

import { authRouter } from './routes/auth';
import { productsRouter } from './routes/products';
import { categoriesRouter } from './routes/categories';
import { stockRouter } from './routes/stock';
import { inventoryRouter } from './routes/inventory';
import { alertsRouter } from './routes/alerts';
import { suppliersRouter } from './routes/suppliers';
import { purchaseOrdersRouter } from './routes/purchaseOrders';
import { reportsRouter } from './routes/reports';
import { usersRouter } from './routes/users';
import { activityRouter } from './routes/activity';
import { salesRouter } from './routes/sales';
import { settingsRouter } from './routes/settings';
import { daySessionsRouter } from './routes/daySessions';
import { permissionsRouter } from './routes/permissions';
import { cashEntriesRouter } from './routes/cashEntries';

import { errorHandler } from './middleware/errorHandler';
import { notFound } from './middleware/notFound';
import { setupSocketIO } from './services/socketService';
import { startCronJobs } from './workers/cronJobs';

const app = express();
app.set('trust proxy', 1);
const httpServer = createServer(app);

// ─── Socket.IO ────────────────────────────────────────────────────────────────

export const io = new SocketIOServer(httpServer, {
  cors: {
    origin: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000'],
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

setupSocketIO(io);

// ─── Middleware ───────────────────────────────────────────────────────────────

app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000'],
  credentials: true,
}));
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ─── Health Check ──────────────────────────────────────────────────────────────

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), version: '1.0.0' });
});

// ─── Swagger ──────────────────────────────────────────────────────────────────

const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Inventory Management API',
      version: '1.0.0',
      description: 'Cross-platform retail inventory management system API',
    },
    servers: [{ url: '/api' }],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
    security: [{ bearerAuth: [] }],
  },
  apis: ['./src/routes/*.ts'],
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// ─── Routes ───────────────────────────────────────────────────────────────────

// Mount routers
app.use('/api/auth', authRouter);
app.use('/api/users', usersRouter);
app.use('/api/permissions', permissionsRouter);
app.use('/api/activity', activityRouter);
app.use('/api/sales', salesRouter);
app.use('/api/products', productsRouter);
app.use('/api/categories', categoriesRouter);
app.use('/api/stock', stockRouter);
app.use('/api/inventory', inventoryRouter);
app.use('/api/alerts', alertsRouter);
app.use('/api/suppliers', suppliersRouter);
app.use('/api/purchase-orders', purchaseOrdersRouter);
app.use('/api/reports', reportsRouter);
app.use('/api/settings', settingsRouter);
app.use('/api/day-sessions', daySessionsRouter);
app.use('/api/cash-entries', cashEntriesRouter);

// ─── Error Handlers ───────────────────────────────────────────────────────────

app.use(notFound);
app.use(errorHandler);

// ─── Start ────────────────────────────────────────────────────────────────────

const PORT = Number(process.env.PORT) || 4000;

httpServer.listen(PORT, () => {
  console.log(`🚀 API server running on port ${PORT}`);
  console.log(`📚 Swagger docs: http://localhost:${PORT}/api/docs`);
  console.log(`🔌 Socket.IO enabled`);
  startCronJobs();
  console.log(`⏱  Cron jobs started`);
});

export default app;
