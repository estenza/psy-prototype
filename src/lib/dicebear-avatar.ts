const DICEBEAR_CROODLES_NEUTRAL_AVATAR_URL =
  "https://api.dicebear.com/9.x/croodles-neutral/svg";
const DICEBEAR_PASTEL_BACKGROUND_COLORS = [
  "b6e3f4",
  "c0aede",
  "d1d4f9",
  "ffd5dc",
  "ffdfbf",
];

function normalizeAvatarSeed(seed: string) {
  return seed.trim().replace(/^@+/, "").toLowerCase() || "vnutri";
}

export function buildGeneratedAvatarUrl(seed: string) {
  const normalizedSeed = normalizeAvatarSeed(seed);
  const avatarUrl = new URL(DICEBEAR_CROODLES_NEUTRAL_AVATAR_URL);
  avatarUrl.searchParams.set("seed", normalizedSeed);
  avatarUrl.searchParams.set("radius", "50");
  avatarUrl.searchParams.set("scale", "80");
  avatarUrl.searchParams.set(
    "backgroundColor",
    DICEBEAR_PASTEL_BACKGROUND_COLORS.join(","),
  );

  return avatarUrl.toString();
}
