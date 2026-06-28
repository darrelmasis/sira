import { Tabs } from "quickit-ui";
import CatalogCrudPanel from "@/features/catalogs/CatalogCrudPanel";
import { catalogConfigs } from "@/features/catalogs/catalogConfigs";

export default function CatalogsPage() {
  return (
    <Tabs defaultValue="granjas" color="primary">
      <Tabs.List>
        <Tabs.Trigger value="granjas">Granjas</Tabs.Trigger>
        <Tabs.Trigger value="galpones">Galpones</Tabs.Trigger>
        <Tabs.Trigger value="lotes">Lotes</Tabs.Trigger>
        <Tabs.Trigger value="alojamientos">Alojamientos</Tabs.Trigger>
      </Tabs.List>

      <div className="mt-4">
        <Tabs.Content value="granjas">
          <CatalogCrudPanel config={catalogConfigs.granjas} />
        </Tabs.Content>
        <Tabs.Content value="galpones">
          <CatalogCrudPanel config={catalogConfigs.galpones} />
        </Tabs.Content>
        <Tabs.Content value="lotes">
          <CatalogCrudPanel config={catalogConfigs.lotes} />
        </Tabs.Content>
        <Tabs.Content value="alojamientos">
          <CatalogCrudPanel config={catalogConfigs.alojamientos} />
        </Tabs.Content>
      </div>
    </Tabs>
  );
}
