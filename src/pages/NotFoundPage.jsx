import { useNavigate } from "react-router-dom";
import { Button, EmptyState } from "quickit-ui";
import { ArrowLeft, FileQuestion } from "lucide-react";

export default function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <EmptyState className="max-w-md">
        <EmptyState.Icon>
          <FileQuestion aria-hidden="true" className="size-8 text-zinc-400" />
        </EmptyState.Icon>
        <EmptyState.Title>Página no encontrada</EmptyState.Title>
        <EmptyState.Description>
          La ruta que buscas no existe o fue movida. Verifica la URL o regresa al espacio de trabajo.
        </EmptyState.Description>
        <EmptyState.Actions>
          <Button type="button" color="brand" onClick={() => navigate("/")}>
            <ArrowLeft aria-hidden="true" className="size-4" />
            Volver al inicio
          </Button>
        </EmptyState.Actions>
      </EmptyState>
    </div>
  );
}
