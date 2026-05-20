const ONLINE_THRESHOLD_MS = 5 * 60 * 1000;

export const formatLastSeen = (lastSeenAt: string | null | undefined): string => {
  if (!lastSeenAt) return 'Never active';
  const diff = Date.now() - new Date(lastSeenAt).getTime();
  if (diff < ONLINE_THRESHOLD_MS)              return 'Online now';
  if (diff < 60 * 60 * 1000)                  return `Last seen ${Math.floor(diff / 60_000)}m ago`;
  if (diff < 24 * 60 * 60 * 1000)             return `Last seen ${Math.floor(diff / 3_600_000)}h ago`;
  const days = Math.floor(diff / 86_400_000);
  if (days === 1)                              return 'Last seen yesterday';
  if (days < 7)                               return `Last seen ${days}d ago`;
  return `Last seen ${new Date(lastSeenAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`;
};

export const isOnlineFromTimestamp = (lastSeenAt: string | null | undefined): boolean => {
  if (!lastSeenAt) return false;
  return Date.now() - new Date(lastSeenAt).getTime() < ONLINE_THRESHOLD_MS;
};
