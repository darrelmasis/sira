import { SidebarNav } from "@/components/layout/navigation";

export default function Sidebar({ can }) {
  return (
    <aside className="sticky top-14.5 hidden h-[calc(100vh-3.5rem)] w-56 shrink-0 overflow-y-auto border-r border-zinc-200 px-3 py-5 dark:border-zinc-800 lg:block">
      <SidebarNav can={can} />
    </aside>
  );
}
