import { useNavigate, useRouteError } from "react-router-dom";
import { Alert, Button, EmptyState } from "quickit-ui";
import { ArrowLeft, TriangleAlert } from "lucide-react";

export default function ErrorPage() {
  const navigate = useNavigate();
  const error = useRouteError();
  const message = error instanceof Error ? error.message : "Ocurrió un error inesperado.";

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-100 p-4 dark:bg-zinc-950">
      <div className="w-full max-w-lg space-y-4">
        <EmptyState>
          <EmptyState.Icon>
            <TriangleAlert aria-hidden="true" className="size-8 text-danger-500" />
          </EmptyState.Icon>
          <EmptyState.Title>Algo salió mal</EmptyState.Title>
          <EmptyState.Description>La aplicación encontró un error y no pudo continuar.</EmptyState.Description>
          <EmptyState.Actions>
            <Button type="button" color="brand" onClick={() => navigate("/")}>
              <ArrowLeft aria-hidden="true" className="size-4" />
              Volver al inicio
            </Button>
          </EmptyState.Actions>
        </EmptyState>
        <Alert color="danger" title="Detalle del error" description={message} />
      </div>
    </div>
  );
}
