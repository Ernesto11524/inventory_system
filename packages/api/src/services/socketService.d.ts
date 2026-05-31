import { Server as SocketIOServer } from 'socket.io';
export declare function setupSocketIO(io: SocketIOServer): void;
export declare function emitStockUpdate(io: SocketIOServer, payload: object): void;
export declare function emitAlertCreated(io: SocketIOServer, payload: object): void;
export declare function emitAlertResolved(io: SocketIOServer, payload: object): void;
//# sourceMappingURL=socketService.d.ts.map