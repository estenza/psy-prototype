const avatarTones = [
  "bg-rose-100 text-rose-700",
  "bg-orange-100 text-orange-700",
  "bg-amber-100 text-amber-700",
  "bg-emerald-100 text-emerald-700",
  "bg-teal-100 text-teal-700",
  "bg-sky-100 text-sky-700",
  "bg-violet-100 text-violet-700",
  "bg-fuchsia-100 text-fuchsia-700",
];

export function getUserAvatarTone(value: string) {
  const hash = Array.from(value).reduce(
    (acc, char) => acc + char.charCodeAt(0),
    0,
  );

  return avatarTones[hash % avatarTones.length];
}
