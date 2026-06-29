import { useCallback, useMemo, useState } from "react";
import { FormDescription } from "quickit-ui";
import AppModal from "@/components/ui/AppModal";

const defaultOptions = {
  title: "¿Confirmar acción?",
  description: "Esta acción no se puede deshacer.",
  confirmLabel: "Confirmar",
  cancelLabel: "Cancelar",
  confirmColor: "danger",
};

export function useConfirmDialog() {
  const [options, setOptions] = useState(null);

  const confirm = useCallback((nextOptions = {}) => {
    return new Promise((resolve) => {
      setOptions({
        ...defaultOptions,
        ...nextOptions,
        resolve,
      });
    });
  }, []);

  const close = useCallback((result) => {
    setOptions((current) => {
      current?.resolve(result);
      return null;
    });
  }, []);

  const ConfirmDialogHost = useMemo(
    () =>
      function ConfirmDialogHostComponent() {
        if (!options) return null;

        return (
          <AppModal open onOpenChange={(open) => !open && close(false)}>
            <AppModal.Content>
              <AppModal.Header>
                <AppModal.Title>{options.title}</AppModal.Title>
                <FormDescription>{options.description}</FormDescription>
              </AppModal.Header>
              <AppModal.Actions>
                <AppModal.Action type="button" variant="ghost" onClick={() => close(false)}>
                  {options.cancelLabel}
                </AppModal.Action>
                <AppModal.Action color={options.confirmColor} onClick={() => close(true)}>
                  {options.confirmLabel}
                </AppModal.Action>
              </AppModal.Actions>
            </AppModal.Content>
          </AppModal>
        );
      },
    [options, close],
  );

  return { confirm, ConfirmDialogHost };
}
