import { useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import { useNotificationStore } from '../store/notificationStore';
import { connectSocket, disconnectSocket } from '../services/socket';
import { notificationsApi } from '../services/api';

export const useSocket = () => {
  const token = useAuthStore((s) => s.token);
  const { setUnreadCount } = useNotificationStore();

  useEffect(() => {
    if (!token) {
      disconnectSocket();
      return;
    }

    const socket = connectSocket(token);

    const handleNotification = (data: { unreadCount: number }) => {
      setUnreadCount(data.unreadCount);
    };

    // Re-fetch the authoritative unread count from the server after every reconnect.
    // Messages or notifications that arrived while the socket was down are reflected here.
    const syncAfterReconnect = () => {
      notificationsApi
        .getNotifications({ limit: 1 })
        .then((r) => setUnreadCount(r.data.meta?.unreadCount ?? 0))
        .catch(() => {});
    };

    socket.on('new_notification', handleNotification);
    socket.on('reconnect', syncAfterReconnect);

    return () => {
      socket.off('new_notification', handleNotification);
      socket.off('reconnect', syncAfterReconnect);
    };
  }, [token, setUnreadCount]);
};
