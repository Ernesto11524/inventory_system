"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.io = void 0;
require("dotenv/config");
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const morgan_1 = __importDefault(require("morgan"));
const http_1 = require("http");
const socket_io_1 = require("socket.io");
const swagger_ui_express_1 = __importDefault(require("swagger-ui-express"));
const swagger_jsdoc_1 = __importDefault(require("swagger-jsdoc"));
const auth_1 = require("./routes/auth");
const products_1 = require("./routes/products");
const categories_1 = require("./routes/categories");
const stock_1 = require("./routes/stock");
const inventory_1 = require("./routes/inventory");
const alerts_1 = require("./routes/alerts");
const suppliers_1 = require("./routes/suppliers");
const purchaseOrders_1 = require("./routes/purchaseOrders");
const reports_1 = require("./routes/reports");
const users_1 = require("./routes/users");
const activity_1 = require("./routes/activity");
const sales_1 = require("./routes/sales");
const settings_1 = require("./routes/settings");
const errorHandler_1 = require("./middleware/errorHandler");
const notFound_1 = require("./middleware/notFound");
const socketService_1 = require("./services/socketService");
const cronJobs_1 = require("./workers/cronJobs");
const app = (0, express_1.default)();
const httpServer = (0, http_1.createServer)(app);
// ─── Socket.IO ────────────────────────────────────────────────────────────────
exports.io = new socket_io_1.Server(httpServer, {
    cors: {
        origin: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000'],
        methods: ['GET', 'POST'],
        credentials: true,
    },
});
(0, socketService_1.setupSocketIO)(exports.io);
// ─── Middleware ───────────────────────────────────────────────────────────────
app.use((0, helmet_1.default)());
app.use((0, cors_1.default)({
    origin: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000'],
    credentials: true,
}));
app.use((0, morgan_1.default)(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use(express_1.default.json({ limit: '10mb' }));
app.use(express_1.default.urlencoded({ extended: true, limit: '10mb' }));
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
const swaggerSpec = (0, swagger_jsdoc_1.default)(swaggerOptions);
app.use('/api/docs', swagger_ui_express_1.default.serve, swagger_ui_express_1.default.setup(swaggerSpec));
// ─── Routes ───────────────────────────────────────────────────────────────────
app.use('/api/auth', auth_1.authRouter);
app.use('/api/users', users_1.usersRouter);
app.use('/api/activity', activity_1.activityRouter);
app.use('/api/sales', sales_1.salesRouter);
app.use('/api/products', products_1.productsRouter);
app.use('/api/categories', categories_1.categoriesRouter);
app.use('/api/stock', stock_1.stockRouter);
app.use('/api/inventory', inventory_1.inventoryRouter);
app.use('/api/alerts', alerts_1.alertsRouter);
app.use('/api/suppliers', suppliers_1.suppliersRouter);
app.use('/api/purchase-orders', purchaseOrders_1.purchaseOrdersRouter);
app.use('/api/reports', reports_1.reportsRouter);
app.use('/api/settings', settings_1.settingsRouter);
// ─── Error Handlers ───────────────────────────────────────────────────────────
app.use(notFound_1.notFound);
app.use(errorHandler_1.errorHandler);
// ─── Start ────────────────────────────────────────────────────────────────────
const PORT = Number(process.env.PORT) || 4000;
httpServer.listen(PORT, () => {
    console.log(`🚀 API server running on port ${PORT}`);
    console.log(`📚 Swagger docs: http://localhost:${PORT}/api/docs`);
    console.log(`🔌 Socket.IO enabled`);
    (0, cronJobs_1.startCronJobs)();
    console.log(`⏱  Cron jobs started`);
});
exports.default = app;
//# sourceMappingURL=index.js.map