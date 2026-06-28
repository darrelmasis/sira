import { Button, FormDescription } from "quickit-ui";
import { Plus } from "lucide-react";
import PageTable from "@/components/data/PageTable";
import ListEmptyState from "@/components/feedback/ListEmptyState";
import AppModal from "@/components/ui/AppModal";
import { useCatalogCrud } from "./useCatalogCrud";
import { useAuth } from "@/features/auth/AuthContext";

export default function CatalogCrudPanel({ config }) {
  const { accessToken } = useAuth();
  const crud = useCatalogCrud(config);
  const { ConfirmDialogHost } = crud;

  const modalSize = config.resource === "alojamientos" ? "xl" : "lg";

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

      <AppModal open={crud.modalOpen} onOpenChange={crud.setModalOpen} size={modalSize}>
        <AppModal.Content>
          <AppModal.Form onSubmit={crud.handleSubmit}>
            <AppModal.Header>
              <AppModal.Title>{crud.editing ? crud.modalTitles.edit : crud.modalTitles.create}</AppModal.Title>
              <FormDescription>Completa los campos obligatorios para {crud.editing ? "actualizar" : "crear"} el registro.</FormDescription>
            </AppModal.Header>
            <AppModal.Body className="space-y-4">
              <div tabIndex={0} className="sr-only" />
              {crud.renderForm({
                form: crud.form,
                setForm: crud.setForm,
                meta: crud.meta,
                editing: crud.editing,
                accessToken,
              })}
            </AppModal.Body>
            <AppModal.Actions>
              <Button type="button" variant="ghost" onClick={() => crud.setModalOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" color="primary" loading={crud.saving} loadingText="Guardando...">
                Guardar
              </Button>
            </AppModal.Actions>
          </AppModal.Form>
        </AppModal.Content>
      </AppModal>

      <ConfirmDialogHost />
    </div>
  );
}
