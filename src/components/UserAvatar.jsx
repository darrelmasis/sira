import { Avatar, AvatarFallback, getInitials } from "quickit-ui";
import { getAvatarById } from "@/features/profile/poultryAvatars";

export default function UserAvatar({
  user,
  nombre,
  username,
  avatarId,
  size = "sm",
  shape = "circle",
  className,
}) {
  const resolvedAvatarId = avatarId ?? user?.avatarId;
  const name = nombre ?? user?.nombre ?? user?.username ?? username ?? "?";
  const avatar = getAvatarById(resolvedAvatarId);
  const initials = getInitials(name);

  return (
    <Avatar size={size} shape={shape} className={className}>
      {avatar ? (
        <avatar.Component className="h-full w-full" />
      ) : (
        <AvatarFallback>{initials}</AvatarFallback>
      )}
    </Avatar>
  );
}
