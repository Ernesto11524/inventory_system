import { Socket } from 'socket.io-client';
interface SocketState {
    socket: Socket | null;
    connected: boolean;
    connect: () => void;
    disconnect: () => void;
}
export declare const useSocketStore: import("zustand").UseBoundStore<import("zustand").StoreApi<SocketState>>;
export {};
//# sourceMappingURL=socketStore.d.ts.map