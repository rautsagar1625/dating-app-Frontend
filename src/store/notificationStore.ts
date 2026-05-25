import { create } from 'zustand';

interface NotificationState {
  unreadCount:     number;
  chatUnreadCount: number;

  setUnreadCount:      (count: number) => void;
  decrementUnread:     (by?: number) => void;
  clearUnread:         () => void;

  setChatUnreadCount:  (count: number) => void;
  incrementChatUnread: () => void;
  clearChatUnread:     () => void;
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  unreadCount:     0,
  chatUnreadCount: 0,

  setUnreadCount:      (count) => set({ unreadCount: Math.max(0, count) }),
  decrementUnread:     (by = 1) => set({ unreadCount: Math.max(0, get().unreadCount - by) }),
  clearUnread:         () => set({ unreadCount: 0 }),

  setChatUnreadCount:  (count) => set({ chatUnreadCount: Math.max(0, count) }),
  incrementChatUnread: () => set({ chatUnreadCount: get().chatUnreadCount + 1 }),
  clearChatUnread:     () => set({ chatUnreadCount: 0 }),
}));
