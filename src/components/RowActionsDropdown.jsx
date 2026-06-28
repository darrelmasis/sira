import { Button, Dropdown } from "quickit-ui";
import { Edit2, MoreVertical, Trash2 } from "lucide-react";

export default function RowActionsDropdown({ onEdit, onDelete, deleteLabel = "Eliminar" }) {
  return (
    <Dropdown>
      <Dropdown.Trigger asChild>
        <Button type="button" size="sm" variant="ghost" color="neutral" shape="square" aria-label="Acciones">
          <MoreVertical aria-hidden="true" className="size-4" />
        </Button>
      </Dropdown.Trigger>
      <Dropdown.Content align="end" className="min-w-36">
        {onEdit && (
          <Dropdown.Item onClick={onEdit}>
            <Edit2 aria-hidden="true" className="size-4" />
            Editar
          </Dropdown.Item>
        )}
        {onDelete && (
          <Dropdown.Item variant="danger" onClick={onDelete}>
            <Trash2 aria-hidden="true" className="size-4" />
            {deleteLabel}
          </Dropdown.Item>
        )}
      </Dropdown.Content>
    </Dropdown>
  );
}
