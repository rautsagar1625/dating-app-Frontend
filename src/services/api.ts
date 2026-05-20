import axios from 'axios';
import { ENV } from '../config/env';
import type { ClientFingerprint } from '../utils/fingerprint';

// ---------------------------------------------------------------------------
// Axios instance
// ---------------------------------------------------------------------------

const api = axios.create({
  baseURL: ENV.API_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

// Lazy store accessors — imported inline to break the authStore ↔ api circular
// dependency that would occur with a top-level import. Both modules are fully
// initialised before any request fires, so the require() is safe here.
const getAuthStore = () =>
  (require('../store/authStore') as typeof import('../store/authStore')).useAuthStore;
const getToast = () =>
  (require('./toast') as typeof import('./toast')).toast;

api.interceptors.request.use((config) => {
  const { token } = getAuthStore().getState();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// 401 mid-session → token expired. Force logout so the user lands back on the
// login screen instead of seeing a cascade of silent failures.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const authStore = getAuthStore();
      // Only trigger if the user was actually logged in (not a failed login attempt)
      if (authStore.getState().token) {
        authStore.getState().logout();
        getToast().error('Your session expired. Please sign in again.');
      }
    }
    return Promise.reject(error);
  },
);

// ---------------------------------------------------------------------------
// Shared types
// ---------------------------------------------------------------------------

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T> {
  meta: { page: number; limit: number; total?: number; count?: number };
}

export interface AuthUser {
  id: string;
  email: string | null;
  phone: string | null;
  role: string;
  name: string | null;
  username: string | null;
  age: number | null;
  gender: string | null;
  location: string | null;
  bio: string | null;
  isPrivatePhoto: boolean;
  isProfileComplete: boolean;
}

export interface Profile {
  userId: string;
  username: string;
  displayUsername?: string;
  age: number | null;
  gender: string | null;
  location: string | null;
  bio: string | null;
  isPrivatePhoto: boolean;
  isAnonymous: boolean;
}

export interface BrowseUser extends Profile {
  isOnline: boolean;
  lastSeenAt: string | null;
  photos: { id: string; url: string }[];
  score?: number;
}

export interface Photo {
  id: string;
  url: string;
  isPrivate: boolean;
  createdAt: string;
}

export interface PhotoAccessRequest {
  id: string;
  requesterId: string;
  ownerId: string;
  status: 'PENDING' | 'GRANTED' | 'DENIED';
  createdAt: string;
}

export interface Like {
  id: string;
  senderId?: string;
  receiverId?: string;
  createdAt: string;
}

export interface CrushItem {
  likeId: string;
  createdAt: string;
  isMutual: boolean;
  user: {
    userId: string;
    username: string | null;
    displayUsername: string | null;
    age: number | null;
    gender: string | null;
    isPrivatePhoto: boolean;
    isOnline: boolean;
    avatarUrl: string | null;
  };
}

export interface ChatListItem {
  id: string;
  isUnlocked: boolean;
  createdAt: string;
  otherUser: { userId: string; username: string | null; avatarUrl: string | null };
  lastMessage: { message: string; createdAt: string; senderId: string } | null;
}

export type MessageStatus = 'SENDING' | 'SENT' | 'DELIVERED' | 'SEEN' | 'FAILED';

export interface Message {
  id: string;
  clientTempId?: string | null;
  senderId: string;
  message: string;
  status: MessageStatus;
  deliveredAt?: string | null;
  seenAt?: string | null;
  createdAt: string;
}

export interface ChatStatus {
  exists: boolean;
  chatId: string | null;
  isUnlocked: boolean;
  unlockCost: number;
}

export interface Transaction {
  id: string;
  amount: number;
  type: 'CREDIT' | 'DEBIT';
  reason: string;
  createdAt: string;
}

// ---------------------------------------------------------------------------
// auth
// ---------------------------------------------------------------------------

export const authApi = {
  register: (body: { email?: string; phone?: string; password: string; deviceFingerprint?: ClientFingerprint }) =>
    api.post<ApiResponse<{ user: AuthUser; token: string }>>('/auth/register', body),

  login: (body: { email?: string; phone?: string; password: string; deviceFingerprint?: ClientFingerprint }) =>
    api.post<ApiResponse<{ user: AuthUser; token: string }>>('/auth/login', body),

  getMe: () =>
    api.get<ApiResponse<{ user: AuthUser }>>('/auth/me'),

  forgotPassword: (body: { email: string }) =>
    api.post<ApiResponse<{ cooldownSeconds: number }>>('/auth/forgot-password', body),

  resetPassword: (body: { token: string; password: string }) =>
    api.post<ApiResponse<null>>('/auth/reset-password', body),

  verifyResetOtp: (body: { email: string; otp: string }) =>
    api.post<ApiResponse<{ resetToken: string }>>('/auth/verify-reset-otp', body),

  resendResetOtp: (body: { email: string }) =>
    api.post<ApiResponse<{ cooldownSeconds: number }>>('/auth/resend-reset-otp', body),

  changePassword: (body: { currentPassword: string; newPassword: string }) =>
    api.post<ApiResponse<null>>('/auth/change-password', body),

  changeEmail: (body: { newEmail: string; password: string }) =>
    api.post<ApiResponse<null>>('/auth/change-email', body),

  changePhone: (body: { newPhone: string; password: string }) =>
    api.post<ApiResponse<null>>('/auth/change-phone', body),

  getSessions: () =>
    api.get<ApiResponse<Array<{ id: string; device: string; ip: string; lastSeen: string; isCurrent: boolean }>>>('/auth/sessions'),

  revokeSession: (sessionId: string) =>
    api.delete<ApiResponse<null>>(`/auth/sessions/${sessionId}`),

  revokeAllSessions: () =>
    api.delete<ApiResponse<null>>('/auth/sessions'),

  deleteAccount: (body: { password: string; reason?: string }) =>
    api.post<ApiResponse<null>>('/auth/delete-account', body),

  requestDataExport: () =>
    api.post<ApiResponse<null>>('/auth/data-export'),
};

// ---------------------------------------------------------------------------
// profile
// ---------------------------------------------------------------------------

export const profileApi = {
  getMyProfile: () =>
    api.get<ApiResponse<Profile>>('/profile'),

  getUserProfile: (userId: string) =>
    api.get<ApiResponse<Profile>>(`/profile/${userId}`),

  upsertProfile: (body: {
    username: string;
    age?: number;
    gender?: string;
    location?: string;
    bio?: string;
    isAnonymous?: boolean;
    isPrivatePhoto?: boolean;
  }) => api.post<ApiResponse<Profile>>('/profile', body),
};

// ---------------------------------------------------------------------------
// users
// ---------------------------------------------------------------------------

export const usersApi = {
  browse: (params?: { gender?: string; online?: boolean; page?: number; limit?: number; age_min?: number; age_max?: number; location?: string }) =>
    api.get<PaginatedResponse<BrowseUser[]>>('/users', { params }),

  getById: (userId: string) =>
    api.get<ApiResponse<BrowseUser>>(`/users/${userId}`),
};

// ---------------------------------------------------------------------------
// likes
// ---------------------------------------------------------------------------

export const likesApi = {
  sendLike: (receiverId: string) =>
    api.post<ApiResponse<{ like: Like; isMutual: boolean }>>('/likes', { receiverId }),

  removeLike: (receiverId: string) =>
    api.delete<ApiResponse<null>>(`/likes/${receiverId}`),

  getLikesSent: () =>
    api.get<ApiResponse<CrushItem[]>>('/likes/sent'),

  getLikesReceived: () =>
    api.get<ApiResponse<CrushItem[]>>('/likes/received'),
};

// ---------------------------------------------------------------------------
// chat
// ---------------------------------------------------------------------------

export interface ChatStartResult {
  chatId: string;
  isUnlocked: boolean;
  unlockCost: number;
  otherUser: { isOnline: boolean; lastSeenAt: string | null };
}

export const chatApi = {
  startChat: (targetUserId: string) =>
    api.post<ApiResponse<ChatStartResult>>(`/chat/start/${targetUserId}`),

  getChats: () =>
    api.get<ApiResponse<ChatListItem[]>>('/chat'),

  getChatStatus: (targetUserId: string) =>
    api.get<ApiResponse<ChatStatus>>(`/chat/status/${targetUserId}`),

  unlockChatById: (chatId: string) =>
    api.post<ApiResponse<{ chatId: string; isUnlocked: boolean; newBalance: number }>>(`/chat/unlock/${chatId}`),

  unlockChat: (targetUserId: string) =>
    api.post<ApiResponse<{ isUnlocked: boolean; newBalance: number }>>('/chat/unlock', { targetUserId }),

  sendMessage: (chatId: string, message: string, clientTempId?: string) =>
    api.post<ApiResponse<Message>>('/chat/message', { chatId, message, clientTempId }),

  getMessages: (chatId: string, params?: { page?: number; limit?: number }) =>
    api.get<PaginatedResponse<Message[]>>(`/chat/${chatId}/messages`, { params }),

  markSeen: (chatId: string) =>
    api.post<ApiResponse<{ markedCount: number }>>(`/chat/${chatId}/seen`),
};

// ---------------------------------------------------------------------------
// wallet
// ---------------------------------------------------------------------------

export const walletApi = {
  getBalance: () =>
    api.get<ApiResponse<{ balance: number }>>('/wallet'),

  addCredits: (body: { packageId?: string; amount?: number }) =>
    api.post<ApiResponse<{ balance: number }>>('/wallet/add', body),

  deductCredits: (body: { amount: number; reason: string }) =>
    api.post<ApiResponse<{ balance: number }>>('/wallet/deduct', body),

  getHistory: (params?: { page?: number; limit?: number }) =>
    api.get<PaginatedResponse<Transaction[]>>('/wallet/history', { params }),
};

// ---------------------------------------------------------------------------
// photos
// ---------------------------------------------------------------------------

export interface VisitorItem {
  visitId: string;
  visitedAt: string;
  visitor: {
    userId: string;
    username: string | null;
    displayUsername: string | null;
    age: number | null;
    gender: string | null;
    isPrivatePhoto: boolean;
    isOnline: boolean;
    avatarUrl: string | null;
  };
}

// ---------------------------------------------------------------------------
// visits
// ---------------------------------------------------------------------------

export const visitsApi = {
  recordVisit: (userId: string) =>
    api.post<ApiResponse<null>>(`/visits/${userId}`),

  getVisitors: (params?: { limit?: number }) =>
    api.get<ApiResponse<VisitorItem[]>>('/visits/visitors', { params }),
};

// ---------------------------------------------------------------------------
// status
// ---------------------------------------------------------------------------

export const statusApi = {
  ping: () => api.post<ApiResponse<{ lastSeen: string }>>('/status/ping'),
};

// ---------------------------------------------------------------------------
// retention
// ---------------------------------------------------------------------------

export interface Nudge {
  type: string;
  count: number;
  label: string;
}

export const retentionApi = {
  getNudge: () => api.get<ApiResponse<{ nudges: Nudge[]; totalActionItems: number }>>('/retention/nudge'),
};

// ---------------------------------------------------------------------------
// settings
// ---------------------------------------------------------------------------

export type AllowMessagesFrom = 'all' | 'liked' | 'none';

export interface PrivacySettings {
  isHidden: boolean;
  allowMessagesFrom: AllowMessagesFrom;
}

export const settingsApi = {
  getPrivacy: () =>
    api.get<ApiResponse<PrivacySettings>>('/settings/privacy'),

  updatePrivacy: (body: Partial<PrivacySettings>) =>
    api.put<ApiResponse<PrivacySettings>>('/settings/privacy', body),
};

// ---------------------------------------------------------------------------
// blocks
// ---------------------------------------------------------------------------

export interface BlockedUser {
  blockId: string;
  blockedAt: string;
  user: { userId: string; username: string | null; avatarUrl: string | null };
}

export const blocksApi = {
  block: (targetUserId: string) =>
    api.post<ApiResponse<{ id: string }>>(`/blocks/${targetUserId}`),

  unblock: (targetUserId: string) =>
    api.delete<ApiResponse<null>>(`/blocks/${targetUserId}`),

  getBlocked: () =>
    api.get<ApiResponse<BlockedUser[]>>('/blocks'),
};

// ---------------------------------------------------------------------------
// favorites
// ---------------------------------------------------------------------------

export interface FavoriteItem {
  favoriteId: string;
  savedAt: string;
  user: {
    userId: string;
    username: string | null;
    age: number | null;
    gender: string | null;
    location: string | null;
    isPrivatePhoto: boolean;
    isOnline: boolean;
    avatarUrl: string | null;
  };
}

export const favoritesApi = {
  add: (targetUserId: string) =>
    api.post<ApiResponse<{ id: string; isFavorited: boolean }>>(`/favorites/${targetUserId}`),

  remove: (targetUserId: string) =>
    api.delete<ApiResponse<{ isFavorited: boolean }>>(`/favorites/${targetUserId}`),

  check: (targetUserId: string) =>
    api.get<ApiResponse<{ isFavorited: boolean }>>(`/favorites/check/${targetUserId}`),

  getAll: (params?: { limit?: number }) =>
    api.get<ApiResponse<FavoriteItem[]>>('/favorites', { params }),
};

// ---------------------------------------------------------------------------
// notifications
// ---------------------------------------------------------------------------

export interface NotificationItem {
  id: string;
  type: 'LIKE' | 'MESSAGE' | 'VISIT';
  referenceId: string;
  isRead: boolean;
  createdAt: string;
}

export const notificationsApi = {
  getNotifications: (params?: { page?: number; limit?: number }) =>
    api.get<ApiResponse<NotificationItem[]> & { meta: { unreadCount: number; page: number; limit: number } }>('/notifications', { params }),

  markRead: (body: { ids?: string[]; all?: boolean }) =>
    api.post<ApiResponse<{ unreadCount: number }>>('/notifications/read', body),
};

// ---------------------------------------------------------------------------
// photos
// ---------------------------------------------------------------------------

export const photosApi = {
  getUserPhotos: (userId: string) =>
    api.get<ApiResponse<Photo[]> & { accessGranted: boolean }>(`/photos/${userId}`),

  uploadPhoto: (uri: string) => {
    const formData = new FormData();
    formData.append('photo', { uri, type: 'image/jpeg', name: 'photo.jpg' } as any);
    return api.post<ApiResponse<Photo>>('/photos/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  unlockPhotos: (userId: string) =>
    api.post<ApiResponse<{ accessGranted: boolean; newBalance: number }>>(`/photos/${userId}/unlock`),

  requestAccess: (userId: string) =>
    api.post<ApiResponse<PhotoAccessRequest>>(`/photos/${userId}/request-access`),

  respondToRequest: (requestId: string, status: 'GRANTED' | 'DENIED') =>
    api.patch<ApiResponse<PhotoAccessRequest>>(`/photos/access/${requestId}`, { status }),

  getPendingRequests: () =>
    api.get<ApiResponse<{ id: string; status: string; createdAt: string; requester: { id: string; profile: { username: string } | null; photos: { url: string }[] } }[]>>('/photos/access/pending'),
};

// ---------------------------------------------------------------------------
// reports
// ---------------------------------------------------------------------------

export const reportsApi = {
  report: (userId: string, reason: string) =>
    api.post<ApiResponse<{ id: string }>>(`/reports/${userId}`, { reason }),
};

// ---------------------------------------------------------------------------
// admin
// ---------------------------------------------------------------------------

export interface AdminUser {
  id: string;
  email: string | null;
  phone: string | null;
  role: string;
  isBanned: boolean;
  createdAt: string;
  lastSeen: string | null;
  profile: { username: string | null; age: number | null; location: string | null } | null;
  reportCount: number;
}

export interface AdminReport {
  id: string;
  reason: string;
  isResolved: boolean;
  createdAt: string;
  reporter: { id: string; email: string | null; profile: { username: string } | null };
  reported: { id: string; email: string | null; isBanned: boolean; profile: { username: string } | null };
}

export const adminApi = {
  getUsers: (params?: { page?: number; limit?: number; search?: string; banned?: boolean }) =>
    api.get<ApiResponse<AdminUser[]> & { meta: { page: number; limit: number; total: number } }>('/admin/users', { params }),

  banUser: (userId: string, isBanned: boolean) =>
    api.post<ApiResponse<{ id: string; isBanned: boolean }>>(`/admin/ban/${userId}`, { isBanned }),

  getReports: (params?: { page?: number; limit?: number; resolved?: boolean }) =>
    api.get<ApiResponse<AdminReport[]> & { meta: { page: number; limit: number; total: number } }>('/admin/reports', { params }),

  resolveReport: (reportId: string) =>
    api.post<ApiResponse<AdminReport>>(`/admin/reports/${reportId}/resolve`),
};

// ---------------------------------------------------------------------------
// push tokens
// ---------------------------------------------------------------------------

export const pushTokenApi = {
  register:   (token: string) => api.post<ApiResponse<null>>('/push-tokens', { token }),
  deregister: (token?: string) => api.delete<ApiResponse<null>>('/push-tokens', { data: { token } }),
};

export const flagsApi = {
  // Returns the full flag map for the current user: { enableVideoCalls: true, ... }
  evaluate: (platform?: 'ios' | 'android' | 'web') =>
    api.get<ApiResponse<Record<string, boolean>>>('/flags/evaluate', {
      headers: platform ? { 'x-platform': platform } : undefined,
    }),
};

// ---------------------------------------------------------------------------
// subscriptions
// ---------------------------------------------------------------------------

export type SubscriptionPlanId = 'velvet_basic' | 'velvet_plus' | 'velvet_gold';
export type SubscriptionPlatform = 'stripe' | 'apple' | 'google';

export interface SubscriptionPlan {
  id:           SubscriptionPlanId;
  name:         string;
  priceMonthly: number;
  priceYearly:  number;
  features:     string[];
  appleProductId?: string;
  googleProductId?: string;
  stripePriceId?: string;
  highlighted?: boolean;
}

export interface ActiveSubscription {
  id:        string;
  planId:    SubscriptionPlanId;
  planName:  string;
  status:    'active' | 'past_due' | 'cancelled' | 'trialing';
  platform:  SubscriptionPlatform;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
}

export const subscriptionsApi = {
  getPlans: () =>
    api.get<ApiResponse<SubscriptionPlan[]>>('/subscriptions/plans'),

  getStatus: () =>
    api.get<ApiResponse<ActiveSubscription | null>>('/subscriptions/status'),

  createCheckout: (body: { planId: SubscriptionPlanId; interval: 'monthly' | 'yearly'; platform: 'stripe' }) =>
    api.post<ApiResponse<{ checkoutUrl: string; sessionId: string }>>('/subscriptions/checkout', body),

  verifyIap: (body: { platform: 'apple' | 'google'; receipt: string; productId: string }) =>
    api.post<ApiResponse<ActiveSubscription>>('/subscriptions/verify-iap', body),

  cancel: () =>
    api.post<ApiResponse<null>>('/subscriptions/cancel'),

  restore: () =>
    api.post<ApiResponse<ActiveSubscription | null>>('/subscriptions/restore'),
};

// ---------------------------------------------------------------------------
// notification preferences
// ---------------------------------------------------------------------------

export interface NotificationPrefs {
  newMatch:      boolean;
  newMessage:    boolean;
  profileVisit:  boolean;
  photoRequest:  boolean;
  promotions:    boolean;
  weeklyDigest:  boolean;
}

export const notifPrefsApi = {
  get: () =>
    api.get<ApiResponse<NotificationPrefs>>('/settings/notifications'),

  update: (body: Partial<NotificationPrefs>) =>
    api.put<ApiResponse<NotificationPrefs>>('/settings/notifications', body),
};

export default api;
