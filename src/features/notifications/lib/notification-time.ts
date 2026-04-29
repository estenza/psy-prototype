export function formatNotificationTime(value: string) {
  const date = new Date(value);
  const diffInSeconds = Math.max(0, Math.floor((Date.now() - date.getTime()) / 1000));

  if (diffInSeconds < 60) {
    return "только что";
  }

  const diffInMinutes = Math.floor(diffInSeconds / 60);

  if (diffInMinutes < 60) {
    return `${diffInMinutes} мин назад`;
  }

  const diffInHours = Math.floor(diffInMinutes / 60);

  if (diffInHours < 24) {
    return `${diffInHours} ч назад`;
  }

  return date.toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "short",
  });
}
