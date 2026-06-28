import { useState } from "react";
import { Link } from "react-router-dom";
import { Alert, Button, EmptyStateTitle, FormControl, FormDescription, Input, Label } from "quickit-ui";
import { api } from "@/lib/api";
import PageSection from "@/components/layout/PageSection";
import { ArrowLeft, Mail } from "lucide-react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await api("auth/forgot-password", {
        method: "POST",
        body: JSON.stringify({ email }),
      });

      if (!response.success) {
        throw new Error(response.message || "Error al solicitar recuperación");
      }

      setSent(true);
    } catch (submitError) {
      setError(submitError.message);
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 p-4 dark:bg-zinc-950">
        <PageSection className="w-full max-w-sm text-center">
          <div className="space-y-4">
            <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-brand-100 dark:bg-brand-900">
              <Mail className="size-6 text-brand-600 dark:text-brand-300" />
            </div>
            <EmptyStateTitle className="text-2xl">Revisa tu correo</EmptyStateTitle>
            <FormDescription>
              Si existe una cuenta con ese correo, recibirás instrucciones para restablecer tu contraseña.
            </FormDescription>
            <Link
              to="/login"
              className="mt-4 inline-flex items-center gap-1 text-sm text-brand-600 hover:text-brand-700 dark:text-brand-400"
            >
              <ArrowLeft className="size-4" />
              Volver al inicio de sesión
            </Link>
          </div>
        </PageSection>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 p-4 dark:bg-zinc-950">
      <PageSection className="w-full max-w-sm">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <EmptyStateTitle className="text-2xl">Recuperar contraseña</EmptyStateTitle>
            <FormDescription>
              Ingresa el correo electrónico asociado a tu cuenta. Te enviaremos un enlace para restablecer tu contraseña.
            </FormDescription>
          </div>

          <FormControl controlId="email" required>
            <Label>Correo electrónico</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="usuario@empresa.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </FormControl>

          {error && <Alert color="danger" title={error} />}

          <Button type="submit" loading={loading} loadingText="Enviando..." className="w-full">
            Enviar enlace
          </Button>

          <div className="text-center">
            <Link
              to="/login"
              className="inline-flex items-center gap-1 text-sm text-brand-600 hover:text-brand-700 dark:text-brand-400"
            >
              <ArrowLeft className="size-4" />
              Volver al inicio de sesión
            </Link>
          </div>
        </form>
      </PageSection>
    </div>
  );
}
