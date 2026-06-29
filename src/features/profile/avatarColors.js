export const AVATAR_COLORS = [
  { bg: "#F87171", text: "#FFFFFF" },
  { bg: "#FB923C", text: "#FFFFFF" },
  { bg: "#FBBF24", text: "#1C1917" },
  { bg: "#A3E635", text: "#1C1917" },
  { bg: "#34D399", text: "#FFFFFF" },
  { bg: "#2DD4BF", text: "#FFFFFF" },
  { bg: "#38BDF8", text: "#FFFFFF" },
  { bg: "#60A5FA", text: "#FFFFFF" },
  { bg: "#818CF8", text: "#FFFFFF" },
  { bg: "#A78BFA", text: "#FFFFFF" },
  { bg: "#C084FC", text: "#FFFFFF" },
  { bg: "#E879F9", text: "#FFFFFF" },
  { bg: "#FB7185", text: "#FFFFFF" },
  { bg: "#F472B6", text: "#FFFFFF" },
  { bg: "#6EE7B7", text: "#1C1917" },
  { bg: "#FCD34D", text: "#1C1917" },
  { bg: "#67E8F9", text: "#1C1917" },
  { bg: "#F9A8D4", text: "#FFFFFF" },
];

export function getAvatarColor(user) {
  const index = user?.avatarColorIndex;
  if (index != null && index >= 0 && index < AVATAR_COLORS.length) {
    return AVATAR_COLORS[index];
  }
  const name = user?.nombre || user?.username || "";
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}
