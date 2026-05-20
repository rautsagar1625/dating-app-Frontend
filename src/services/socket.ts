import { io, Socket } from 'socket.io-client';
import { ENV } from '../config/env';

let socket: Socket | null = null;

// Callbacks registered by consumers (e.g. ChatScreen) to run after a reconnect.
// Keyed by a stable consumer ID so each consumer registers exactly once.
const reconnectHandlers = new Map<string, () => void>();

export const connectSocket = (token: string): Socket => {
  // Already connected with the same token — reuse
  if (socket?.connected) return socket;

  // Disconnect stale socket before creating a new one (handles re-login)
  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
  }

  socket = io(ENV.SOCKET_URL, {
    auth: { token },
    transports: ['websocket'],
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 10000,
  });

  // Fire all registered reconnect handlers so consumers can re-sync state
  socket.on('reconnect', () => {
    reconnectHandlers.forEach((handler) => handler());
  });

  return socket;
};

export const disconnectSocket = (): void => {
  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
  }
  reconnectHandlers.clear();
};

export const getSocket = (): Socket | null => socket;

/** Register a callback that fires after every reconnect (e.g. re-fetch messages). */
export const onReconnect = (id: string, handler: () => void): (() => void) => {
  reconnectHandlers.set(id, handler);
  return () => reconnectHandlers.delete(id);
};
