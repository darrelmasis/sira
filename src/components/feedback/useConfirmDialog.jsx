import { useCallback, useMemo, useState } from "react";
import { Modal, FormDescription } from "quickit-ui";

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
          <Modal open onOpenChange={(open) => !open && close(false)}>
            <Modal.Content>
              <Modal.Header>
                <Modal.Title>{options.title}</Modal.Title>
                <FormDescription>{options.description}</FormDescription>
              </Modal.Header>
              <Modal.Actions>
                <Modal.Action type="button" variant="ghost" onClick={() => close(false)}>
                  {options.cancelLabel}
                </Modal.Action>
                <Modal.Action color={options.confirmColor} onClick={() => close(true)}>
                  {options.confirmLabel}
                </Modal.Action>
              </Modal.Actions>
            </Modal.Content>
          </Modal>
        );
      },
    [options, close],
  );

  return { confirm, ConfirmDialogHost };
}
