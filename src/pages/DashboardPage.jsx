import { Database, History, Settings, Skull, User, Users } from "lucide-react";
import QuickAccessCard from "@/components/layout/QuickAccessCard";
import { usePermissions } from "@/features/auth/permissions";

export default function DashboardPage() {
  const { can } = usePermissions();

  return (
    <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
      <QuickAccessCard to="/mortalidad" icon={Skull} label="Mortalidad" description="Registrar aves muertas" />
      <QuickAccessCard to="/historial" icon={History} label="Historial" description="Ver registros capturados" accent="info" />
      <QuickAccessCard to="/cuenta" icon={User} label="Mi cuenta" description="Perfil y contraseña" />
      {(can("users.manage") || can("roles.manage")) && (
        <QuickAccessCard to="/usuarios" icon={Users} label="Usuarios" description="Cuentas y permisos por rol" accent="warning" />
      )}
      {can("catalogs.manage") && (
        <QuickAccessCard to="/catalogos" icon={Database} label="Catálogos" description="Granjas, galpones y lotes" accent="warning" />
      )}
      {can("settings.view") && (
        <QuickAccessCard to="/sistema" icon={Settings} label="Sistema" description="Tema, sync y catálogos" />
      )}
    </div>
  );
}
