import { useEffect, useState } from "react";
import { Button, cn, FormDescription, toast, Tooltip } from "quickit-ui";
import { Check } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/features/auth/AuthContext";
import UserAvatar from "@/components/UserAvatar";
import { POULTRY_AVATARS } from "@/features/profile/poultryAvatars";

export default function AvatarPicker() {
  const { user, accessToken, updateUser } = useAuth();
  const [selectedId, setSelectedId] = useState(user?.avatarId || null);
  const [savingId, setSavingId] = useState(null);

  useEffect(() => {
    setSelectedId(user?.avatarId || null);
  }, [user?.avatarId]);

  async function selectAvatar(avatarId) {
    if (selectedId === avatarId) return;

    const previousId = selectedId;
    setSelectedId(avatarId);
    updateUser({ ...user, avatarId });

    setSavingId(avatarId ?? "initials");
    try {
      const response = await api("auth/profile", {
        method: "PUT",
        accessToken,
        body: JSON.stringify({ avatarId }),
      });

      if (!response.success) {
        throw new Error(response.message || "No se pudo guardar el avatar");
      }

      updateUser(response.data);
    } catch (error) {
      setSelectedId(previousId);
      updateUser({ ...user, avatarId: previousId });
      toast({ title: error.message, kind: "error" });
    } finally {
      setSavingId(null);
    }
  }

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-6">
      <div className="flex shrink-0 items-center gap-3 sm:flex-col sm:gap-2">
        <UserAvatar user={{ ...user, avatarId: selectedId }} size="md" />
        <FormDescription>Vista previa</FormDescription>
      </div>

      <div className="min-w-0 flex-1">
        <FormDescription className="mb-2">
          Toca un avatar para cambiarlo
        </FormDescription>
        <div className="flex flex-wrap gap-1.5">
          <Tooltip
            content="Usar iniciales"
            color="brand"
          >
            <Button
              type="button"
              variant="ghost"
              color="neutral"
              shape="circle"
              size="sm"
              aria-label="Usar iniciales"
              aria-pressed={!selectedId}
              disabled={Boolean(savingId)}
              loading={savingId === "initials"}
              className={cn(
                "size-9 min-w-9 p-0 text-[11px] font-semibold",
                !selectedId &&
                  "scale-110 bg-brand-500/15 text-brand-700 dark:text-brand-300",
              )}
              onClick={() => selectAvatar(null)}
            >
              {(user?.nombre || user?.username || "?")
                .split(" ")
                .map((part) => part[0])
                .join("")
                .slice(0, 2)
                .toUpperCase()}
            </Button>
          </Tooltip>

          {POULTRY_AVATARS.map((avatar) => {
            const isSelected = selectedId === avatar.id;
            const isSaving = savingId === avatar.id;

            return (
              <Tooltip
                content={avatar.label}
                color={isSelected ? "success" : "neutral"}
                key={avatar.id}
              >
                <Button
                  key={avatar.id}
                  type="button"
                  variant="ghost"
                  color="neutral"
                  shape="circle"
                  size="sm"
                  aria-label={avatar.label}
                  aria-pressed={isSelected}
                  disabled={Boolean(savingId)}
                  loading={isSaving}
                  className={cn(
                    "relative size-9 min-w-9 overflow-hidden p-0 transition-all duration-150 hover:scale-120",
                    isSelected
                      ? "scale-130 shadow-md"
                      : "opacity-90 hover:opacity-100",
                  )}
                  onClick={() => selectAvatar(avatar.id)}
                >
                  <avatar.Component className="h-full w-full" />
                  {isSelected && (
                    <span className="pointer-events-none absolute inset-0 flex items-center justify-center bg-brand-500/20">
                      <span className="rounded-full bg-brand-500 p-0.5 text-white">
                        <Check aria-hidden="true" className="size-3" />
                      </span>
                    </span>
                  )}
                </Button>
              </Tooltip>
            );
          })}
        </div>
      </div>
    </div>
  );
}
