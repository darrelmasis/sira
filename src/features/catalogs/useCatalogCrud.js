import { useEffect, useState } from "react";
import { toast } from "quickit-ui";
import { api } from "@/lib/api";
import { useAuth } from "@/features/auth/AuthContext";
import { refreshCatalogs } from "./catalogStore";
import { useConfirmDialog } from "@/components/feedback/useConfirmDialog";

export function useCatalogCrud(config) {
  const { accessToken } = useAuth();
  const { confirm, ConfirmDialogHost } = useConfirmDialog();
  const [data, setData] = useState([]);
  const [meta, setMeta] = useState({});
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(() => config.initialForm({}));

  async function loadData() {
    setLoading(true);
    try {
      await config.load({ accessToken, setData, setMeta });
    } catch {
      toast({ title: config.loadError, kind: "error" });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  function openCreate() {
    setEditing(null);
    setForm(config.initialForm(meta));
    setModalOpen(true);
  }

  function openEdit(row) {
    setEditing(row);
    setForm(config.toForm(row));
    setModalOpen(true);
  }

  async function handleDelete(id) {
    const confirmed = await confirm({
      title: config.deleteTitle,
      description: config.deleteDescription,
      confirmLabel: "Eliminar",
    });
    if (!confirmed) return;

    const response = await api(config.resource, {
      method: "DELETE",
      accessToken,
      body: JSON.stringify({ id }),
    });

    if (response.success) {
      toast({ title: config.deleteSuccess, kind: "success" });
      await loadData();
      await refreshCatalogs(accessToken);
    } else {
      toast({ title: response.message || "Error al eliminar", kind: "error" });
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const error = config.validate(form, data, editing);
    if (error) {
      toast({ title: error, kind: "error" });
      return;
    }

    setSaving(true);
    try {
      const payload = config.toPayload ? config.toPayload(form) : form;
      const response = await api(config.resource, {
        method: editing ? "PUT" : "POST",
        accessToken,
        body: JSON.stringify({ ...payload, id: editing?.id }),
      });
      if (!response.success) throw new Error(response.message);
      toast({ title: editing ? config.updateSuccess : config.createSuccess, kind: "success" });
      setModalOpen(false);
      await loadData();
      await refreshCatalogs(accessToken);
    } catch (error) {
      toast({ title: error.message || "Error al guardar", kind: "error" });
    } finally {
      setSaving(false);
    }
  }

  const columns = config.buildColumns({ meta, openEdit, handleDelete });
  const prerequisiteEmpty = config.getPrerequisiteEmpty?.(meta);
  const empty = config.getEmpty?.(meta, data);

  return {
    data,
    loading,
    modalOpen,
    setModalOpen,
    saving,
    editing,
    form,
    setForm,
    openCreate,
    handleSubmit,
    columns,
    prerequisiteEmpty,
    empty,
    ConfirmDialogHost,
    canCreate: config.canCreate?.(meta) ?? true,
    createLabel: config.createLabel,
    modalTitles: config.modalTitles,
    renderForm: config.renderForm,
    skeleton: config.skeleton,
  };
}
