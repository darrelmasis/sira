export const AVATAR_IDS = [
  "gallina",
  "gallo",
  "pollito",
  "huevo",
  "granero",
  "galpon",
  "plumas",
  "granjero",
  "alimento",
  "amanecer",
];

export const AVATAR_COLORS_COUNT = 18;

export function isValidAvatarId(value) {
  return typeof value === "string" && AVATAR_IDS.includes(value);
}

export function isValidAvatarColorIndex(value) {
  return value === null || value === undefined || (Number.isInteger(value) && value >= 0 && value < AVATAR_COLORS_COUNT);
}
