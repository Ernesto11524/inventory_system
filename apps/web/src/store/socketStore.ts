import { create } from 'zustand';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from './authStore';

interface SocketState {
  socket: Socket | null;
  connected: boolean;
  connect: () => void;
  disconnect: () => void;
}

const WS_URL = import.meta.env.VITE_WS_URL || 'http://localhost:4000';

// Single socket instance outside the store — never recreated
let socketInstance: Socket | null = null;

export const useSocketStore = create<SocketState>((set, get) => ({
  socket: null,
  connected: false,

  connect: () => {
    // If already connected, do nothing
    if (socketInstance?.connected) {
      set({ socket: socketInstance, connected: true });
      return;
    }

    // If socket exists but disconnected, reconnect
    if (socketInstance) {
      socketInstance.connect();
      set({ socket: socketInstance });
      return;
    }

    const { accessToken } = useAuthStore.getState();
    if (!accessToken) return;

    // Create socket only once
    socketInstance = io(WS_URL, {
      auth: { token: accessToken },
      reconnection: true,
      reconnectionDelay: 2000,
      reconnectionAttempts: 10,
    });

    socketInstance.on('connect', () => {
      set({ connected: true, socket: socketInstance });
    });

    socketInstance.on('disconnect', () => {
      set({ connected: false });
    });

    socketInstance.on('connect_error', (err) => {
      console.warn('Socket connection error:', err.message);
    });

    set({ socket: socketInstance });
  },

  disconnect: () => {
    if (socketInstance) {
      socketInstance.disconnect();
      socketInstance = null;
    }
    set({ socket: null, connected: false });
  },
}));
