import { Modal, cn } from "quickit-ui";

const MODAL_SIZES = {
  sm: "max-w-md",
  md: "max-w-lg",
  lg: "max-w-2xl",
  xl: "max-w-4xl",
};

const modalShellClass = "flex min-h-0 flex-1 flex-col overflow-hidden";

/**
 * Modal con ancho configurable y scroll correcto en el cuerpo.
 * El formulario interno debe usar AppModal.Form para no cortar contenido largo.
 */
export default function AppModal({
  open,
  onOpenChange,
  size,
  maxWidth,
  children,
  ...props
}) {
  const resolvedMaxWidth = maxWidth ?? (size ? MODAL_SIZES[size] : undefined);

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      {...(resolvedMaxWidth ? { maxWidth: resolvedMaxWidth } : {})}
      {...props}
    >
      {children}
    </Modal>
  );
}

function AppModalContent({ className, children }) {
  return <Modal.Content className={className}>{children}</Modal.Content>;
}

function AppModalLayout({ className, children }) {
  return <div className={cn(modalShellClass, className)}>{children}</div>;
}

function AppModalForm({ onSubmit, className, children, ...props }) {
  return (
    <form onSubmit={onSubmit} className={cn(modalShellClass, className)} {...props}>
      {children}
    </form>
  );
}

function AppModalBody({ className, children }) {
  return <Modal.Body className={cn("min-h-0", className)}>{children}</Modal.Body>;
}

AppModal.Content = AppModalContent;
AppModal.Layout = AppModalLayout;
AppModal.Form = AppModalForm;
AppModal.Header = Modal.Header;
AppModal.Title = Modal.Title;
AppModal.Body = AppModalBody;
AppModal.Actions = Modal.Actions;
AppModal.Action = Modal.Action;
AppModal.Trigger = Modal.Trigger;

export { MODAL_SIZES };
