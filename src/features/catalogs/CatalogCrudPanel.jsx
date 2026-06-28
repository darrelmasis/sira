import { Button, DataTable, Modal } from "quickit-ui";
import { Plus } from "lucide-react";
import TableSkeleton from "@/components/feedback/TableSkeleton";
import ListEmptyState from "@/components/feedback/ListEmptyState";
import { useCatalogCrud } from "./useCatalogCrud";

export default function CatalogCrudPanel({ config }) {
  const crud = useCatalogCrud(config);
  const { ConfirmDialogHost } = crud;

  if (crud.loading) {
    return (
      <TableSkeleton
        columns={crud.skeleton.columns}
        rows={crud.skeleton.rows}
        showActionsColumn
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={crud.openCreate} size="sm" color="brand" disabled={!crud.canCreate}>
          <Plus className="size-4" /> {crud.createLabel}
        </Button>
      </div>

      {crud.prerequisiteEmpty ? (
        <ListEmptyState {...crud.prerequisiteEmpty} />
      ) : crud.data.length === 0 && crud.empty ? (
        <ListEmptyState
          {...crud.empty}
          actions={
            crud.empty.actionsLabel ? (
              <Button type="button" color="brand" onClick={crud.openCreate}>
                <Plus className="size-4" /> {crud.empty.actionsLabel}
              </Button>
            ) : undefined
          }
        />
      ) : (
        <DataTable
          data={crud.data}
          columns={crud.columns}
          rowKey={(row) => row.id}
          stickyHeader
          color="neutral"
        />
      )}

      <Modal open={crud.modalOpen} onOpenChange={crud.setModalOpen}>
        <Modal.Content>
          <form onSubmit={crud.handleSubmit}>
            <Modal.Header>
              <Modal.Title>{crud.editing ? crud.modalTitles.edit : crud.modalTitles.create}</Modal.Title>
            </Modal.Header>
            <Modal.Body className="space-y-4">
              {crud.renderForm({ form: crud.form, setForm: crud.setForm, meta: crud.meta })}
            </Modal.Body>
            <Modal.Actions>
              <Modal.Action type="button" variant="ghost" onClick={() => crud.setModalOpen(false)}>
                Cancelar
              </Modal.Action>
              <Modal.Action type="submit" loading={crud.saving} loadingText="Guardando...">
                Guardar
              </Modal.Action>
            </Modal.Actions>
          </form>
        </Modal.Content>
      </Modal>

      <ConfirmDialogHost />
    </div>
  );
}
