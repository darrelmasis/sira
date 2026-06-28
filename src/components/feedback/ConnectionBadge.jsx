import { Badge, Tooltip } from "quickit-ui";
import { Wifi, WifiOff } from "lucide-react";
import { useOnlineStatus } from "@/lib/online";

export default function ConnectionBadge() {
  const isOnline = useOnlineStatus();
  const Icon = isOnline ? Wifi : WifiOff;

  return (
    <span className="cursor-pointer">
      <Tooltip
        content={isOnline ? "Conectado" : "Desconectado"}
        color={isOnline ? "success" : "danger"}
      >
        {isOnline ? (
          <Icon
            aria-hidden="true"
            className="w-5 text-green-500 dark:text-green-300"
          />
        ) : (
          <Icon
            aria-hidden="true"
            className="w-5 text-red-500 dark:text-red-300"
          />
        )}
      </Tooltip>
    </span>
  );
}
