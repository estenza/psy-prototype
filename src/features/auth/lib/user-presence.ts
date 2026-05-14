export function formatUserLastSeenLabel(
  updatedAt: string | null | undefined,
  now = new Date(),
) {
  const lastSeenAt = updatedAt ? new Date(updatedAt) : null;

  if (!lastSeenAt || Number.isNaN(lastSeenAt.getTime())) {
    return "Был(а) недавно";
  }

  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const lastSeenDayStart = new Date(
    lastSeenAt.getFullYear(),
    lastSeenAt.getMonth(),
    lastSeenAt.getDate(),
  );
  const diffInDays = Math.floor(
    (todayStart.getTime() - lastSeenDayStart.getTime()) / 86_400_000,
  );

  if (diffInDays <= 0) {
    return "Был(а) сегодня";
  }

  if (diffInDays === 1) {
    return "Был(а) вчера";
  }

  return "Был(а) недавно";
}
