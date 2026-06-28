import { Button, FormDescription, Modal } from "quickit-ui";
import { Plus } from "lucide-react";
import PageTable from "@/components/data/PageTable";
import ListEmptyState from "@/components/feedback/ListEmptyState";
import { useCatalogCrud } from "./useCatalogCrud";

export default function CatalogCrudPanel({ config }) {
  const crud = useCatalogCrud(config);
  const { ConfirmDialogHost } = crud;

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button type="button" onClick={crud.openCreate} size="md" color="brand" disabled={!crud.canCreate}>
          <Plus aria-hidden="true" className="size-4" /> {crud.createLabel}
        </Button>
      </div>

      {crud.prerequisiteEmpty ? (
        <ListEmptyState {...crud.prerequisiteEmpty} />
      ) : (
        <PageTable
          columns={crud.columns}
          data={crud.data}
          rowKey={(row) => row.id}
          loading={crud.loading}
          stickyHeader
          color="neutral"
          limit={25}
          skeletonRows={crud.skeleton?.rows || 6}
          emptyIcon={crud.empty?.icon}
          emptyTitle={crud.empty?.title}
          emptyDescription={crud.empty?.description}
          emptyActions={
            !crud.editing && crud.empty?.actionsLabel ? (
              <Button type="button" color="brand" onClick={crud.openCreate}>
                <Plus aria-hidden="true" className="size-4" /> {crud.empty.actionsLabel}
              </Button>
            ) : undefined
          }
        />
      )}

      <Modal open={crud.modalOpen} onOpenChange={crud.setModalOpen}>
        <Modal.Content>
          <form onSubmit={crud.handleSubmit}>
            <Modal.Header>
              <Modal.Title>{crud.editing ? crud.modalTitles.edit : crud.modalTitles.create}</Modal.Title>
              <FormDescription>Completa los campos obligatorios para {crud.editing ? "actualizar" : "crear"} el registro.</FormDescription>
            </Modal.Header>
            <Modal.Body className="space-y-4">
              <div tabIndex={0} className="sr-only" />
              {crud.renderForm({ form: crud.form, setForm: crud.setForm, meta: crud.meta })}
            </Modal.Body>
            <Modal.Actions>
              <Button type="button" variant="ghost" onClick={() => crud.setModalOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" color="primary" loading={crud.saving} loadingText="Guardando...">
                Guardar
              </Button>
            </Modal.Actions>
          </form>
        </Modal.Content>
      </Modal>

      <ConfirmDialogHost />
    </div>
  );
}
