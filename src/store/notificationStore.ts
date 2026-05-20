import { create } from 'zustand';

interface NotificationState {
  unreadCount: number;
  setUnreadCount: (count: number) => void;
  decrementUnread: (by?: number) => void;
  clearUnread: () => void;
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  unreadCount: 0,
  setUnreadCount: (count) => set({ unreadCount: Math.max(0, count) }),
  decrementUnread: (by = 1) => set({ unreadCount: Math.max(0, get().unreadCount - by) }),
  clearUnread: () => set({ unreadCount: 0 }),
}));
