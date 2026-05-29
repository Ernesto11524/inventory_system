import { Server as SocketIOServer, Socket } from 'socket.io';
import { verifyAccessToken } from '../utils/jwt';
import { SOCKET_EVENTS } from '@inventory/shared';

export function setupSocketIO(io: SocketIOServer): void {
  // Auth middleware
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.split(' ')[1];
    if (!token) {
      return next(new Error('Authentication required'));
    }
    try {
      const payload = verifyAccessToken(token);
      (socket as any).user = payload;
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket: Socket) => {
    const user = (socket as any).user;
    console.log(`Socket connected: ${socket.id} (user: ${user?.email})`);

    // Join user to their personal room
    socket.join(`user:${user.userId}`);
    socket.join('global'); // All authenticated users

    socket.on(SOCKET_EVENTS.JOIN_ROOM, (room: string) => {
      socket.join(room);
    });

    socket.on(SOCKET_EVENTS.LEAVE_ROOM, (room: string) => {
      socket.leave(room);
    });

    socket.on('disconnect', () => {
      console.log(`Socket disconnected: ${socket.id}`);
    });
  });
}

export function emitStockUpdate(io: SocketIOServer, payload: object): void {
  io.to('global').emit(SOCKET_EVENTS.STOCK_UPDATED, payload);
}

export function emitAlertCreated(io: SocketIOServer, payload: object): void {
  io.to('global').emit(SOCKET_EVENTS.ALERT_CREATED, payload);
}

export function emitAlertResolved(io: SocketIOServer, payload: object): void {
  io.to('global').emit(SOCKET_EVENTS.ALERT_RESOLVED, payload);
}
