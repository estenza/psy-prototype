const DICEBEAR_LORELEI_AVATAR_URL = "https://api.dicebear.com/9.x/lorelei-neutral/svg";
const DICEBEAR_LORELEI_BACKGROUND_COLORS = [
  "b6e3f4",
  "c0aede",
  "d1d4f9",
  "ffd5dc",
  "ffdfbf",
];
const DICEBEAR_LORELEI_EYEBROWS = Array.from({ length: 13 }, (_, index) => (
  `variant${String(index + 1).padStart(2, "0")}`
));
const DICEBEAR_LORELEI_EYES = Array.from({ length: 24 }, (_, index) => (
  `variant${String(index + 1).padStart(2, "0")}`
));
const DICEBEAR_LORELEI_MOUTH = [
  ...Array.from({ length: 18 }, (_, index) => (
    `happy${String(index + 1).padStart(2, "0")}`
  )),
  ...Array.from({ length: 9 }, (_, index) => (
    `sad${String(index + 1).padStart(2, "0")}`
  )),
];
const DICEBEAR_LORELEI_NOSE = Array.from({ length: 6 }, (_, index) => (
  `variant${String(index + 1).padStart(2, "0")}`
));
const DICEBEAR_LORELEI_GLASSES = Array.from({ length: 5 }, (_, index) => (
  `variant${String(index + 1).padStart(2, "0")}`
));

function getSeedHash(seed: string) {
  let hash = 0;

  for (let index = 0; index < seed.length; index += 1) {
    hash = ((hash << 5) - hash + seed.charCodeAt(index)) | 0;
  }

  return Math.abs(hash);
}

function pickSeededOption(seed: string, salt: string, options: string[]) {
  return options[getSeedHash(`${seed}:${salt}`) % options.length];
}

function normalizeAvatarSeed(seed: string) {
  return seed.trim().replace(/^@+/, "").toLowerCase() || "vnutri";
}

export function buildLoreleiAvatarUrl(seed: string) {
  const normalizedSeed = normalizeAvatarSeed(seed);
  const avatarUrl = new URL(DICEBEAR_LORELEI_AVATAR_URL);
  avatarUrl.searchParams.set("seed", normalizedSeed);
  avatarUrl.searchParams.set("radius", "50");
  avatarUrl.searchParams.set("frecklesProbability", "0");
  avatarUrl.searchParams.set("glassesProbability", "12");
  avatarUrl.searchParams.set(
    "backgroundColor",
    pickSeededOption(normalizedSeed, "background", DICEBEAR_LORELEI_BACKGROUND_COLORS),
  );
  avatarUrl.searchParams.set(
    "eyebrows",
    pickSeededOption(normalizedSeed, "eyebrows", DICEBEAR_LORELEI_EYEBROWS),
  );
  avatarUrl.searchParams.set(
    "eyes",
    pickSeededOption(normalizedSeed, "eyes", DICEBEAR_LORELEI_EYES),
  );
  avatarUrl.searchParams.set(
    "mouth",
    pickSeededOption(normalizedSeed, "mouth", DICEBEAR_LORELEI_MOUTH),
  );
  avatarUrl.searchParams.set(
    "nose",
    pickSeededOption(normalizedSeed, "nose", DICEBEAR_LORELEI_NOSE),
  );
  avatarUrl.searchParams.set(
    "glasses",
    pickSeededOption(normalizedSeed, "glasses", DICEBEAR_LORELEI_GLASSES),
  );

  return avatarUrl.toString();
}
