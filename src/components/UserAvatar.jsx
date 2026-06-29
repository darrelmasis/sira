import { Avatar, AvatarFallback, getInitials, cn } from "quickit-ui";
import { getAvatarById } from "@/features/profile/poultryAvatars";
import { getAvatarColor } from "@/features/profile/avatarColors";

export default function UserAvatar({
  user,
  nombre,
  username,
  avatarId,
  avatarColorIndex,
  size = "sm",
  shape = "circle",
  className,
}) {
  const resolvedAvatarId = avatarId ?? user?.avatarId;
  const resolvedUser = user
    ? { ...user, avatarColorIndex: avatarColorIndex ?? user?.avatarColorIndex }
    : null;
  const name = nombre ?? user?.nombre ?? user?.username ?? username ?? "?";
  const avatar = getAvatarById(resolvedAvatarId);
  const initials = getInitials(name);
  const color = getAvatarColor(resolvedUser);

  return (
    <Avatar size={size} shape={shape} className={cn("!p-0", className)}>
      {avatar ? (
        <avatar.Component className="h-full w-full" />
      ) : (
        <AvatarFallback
          style={{ backgroundColor: color.bg, color: color.text }}
        >
          {initials}
        </AvatarFallback>
      )}
    </Avatar>
  );
}
