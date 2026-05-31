"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupSocketIO = setupSocketIO;
exports.emitStockUpdate = emitStockUpdate;
exports.emitAlertCreated = emitAlertCreated;
exports.emitAlertResolved = emitAlertResolved;
const jwt_1 = require("../utils/jwt");
const shared_1 = require("@inventory/shared");
function setupSocketIO(io) {
    // Auth middleware
    io.use((socket, next) => {
        const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.split(' ')[1];
        if (!token) {
            return next(new Error('Authentication required'));
        }
        try {
            const payload = (0, jwt_1.verifyAccessToken)(token);
            socket.user = payload;
            next();
        }
        catch {
            next(new Error('Invalid token'));
        }
    });
    io.on('connection', (socket) => {
        const user = socket.user;
        console.log(`Socket connected: ${socket.id} (user: ${user?.email})`);
        // Join user to their personal room
        socket.join(`user:${user.userId}`);
        socket.join('global'); // All authenticated users
        socket.on(shared_1.SOCKET_EVENTS.JOIN_ROOM, (room) => {
            socket.join(room);
        });
        socket.on(shared_1.SOCKET_EVENTS.LEAVE_ROOM, (room) => {
            socket.leave(room);
        });
        socket.on('disconnect', () => {
            console.log(`Socket disconnected: ${socket.id}`);
        });
    });
}
function emitStockUpdate(io, payload) {
    io.to('global').emit(shared_1.SOCKET_EVENTS.STOCK_UPDATED, payload);
}
function emitAlertCreated(io, payload) {
    io.to('global').emit(shared_1.SOCKET_EVENTS.ALERT_CREATED, payload);
}
function emitAlertResolved(io, payload) {
    io.to('global').emit(shared_1.SOCKET_EVENTS.ALERT_RESOLVED, payload);
}
//# sourceMappingURL=socketService.js.map