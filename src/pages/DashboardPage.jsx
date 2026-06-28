import { Database, Egg, History, Settings, Skull, User, Users } from "lucide-react";
import QuickAccessCard from "@/components/layout/QuickAccessCard";
import { usePermissions } from "@/features/auth/permissions";

export default function DashboardPage() {
  const { can } = usePermissions();

  return (
    <div className="grid gap-2 grid-cols-3 lg:grid-cols-6 xl:grid-cols-6">
      <QuickAccessCard to="/mortalidad" icon={Skull} label="Mortalidad" />
      <QuickAccessCard to="/produccion" icon={Egg} label="Producción" accent="success" />
      <QuickAccessCard to="/historial" icon={History} label="Historial" accent="info" />
      <QuickAccessCard to="/cuenta" icon={User} label="Mi cuenta" />
      {(can("users.manage") || can("roles.manage")) && (
        <QuickAccessCard to="/usuarios" icon={Users} label="Usuarios" accent="warning" />
      )}
      {can("catalogs.manage") && (
        <QuickAccessCard to="/catalogos" icon={Database} label="Catálogos" accent="warning" />
      )}
      {can("settings.view") && (
        <QuickAccessCard to="/sistema" icon={Settings} label="Sistema" />
      )}
    </div>
  );
}
