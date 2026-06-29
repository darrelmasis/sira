import { Tabs } from "quickit-ui";
import CatalogCrudPanel from "@/features/catalogs/CatalogCrudPanel";
import { catalogConfigs } from "@/features/catalogs/catalogConfigs";

export default function CatalogsPage() {
  return (
    <Tabs defaultValue="granjas" color="brand">
      <Tabs.List>
        <Tabs.Trigger value="granjas">Granjas</Tabs.Trigger>
        <Tabs.Trigger value="complejos">Complejos</Tabs.Trigger>
        <Tabs.Trigger value="lotes">Lotes</Tabs.Trigger>
        <Tabs.Trigger value="alojamientos">Alojamientos</Tabs.Trigger>
      </Tabs.List>

      <Tabs.Content value="granjas" className="pt-4">
        <CatalogCrudPanel config={catalogConfigs.granjas} />
      </Tabs.Content>
      <Tabs.Content value="complejos" className="pt-4">
        <CatalogCrudPanel config={catalogConfigs.complejos} />
      </Tabs.Content>
      <Tabs.Content value="lotes" className="pt-4">
        <CatalogCrudPanel config={catalogConfigs.lotes} />
      </Tabs.Content>
      <Tabs.Content value="alojamientos" className="pt-4">
        <CatalogCrudPanel config={catalogConfigs.alojamientos} />
      </Tabs.Content>
    </Tabs>
  );
}
