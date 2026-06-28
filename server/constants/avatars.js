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

export function isValidAvatarId(value) {
  return typeof value === "string" && AVATAR_IDS.includes(value);
}
