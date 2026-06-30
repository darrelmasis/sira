import { Skeleton } from "quickit-ui";

export default function AuthLoadingShell() {
  return (
    <div className="min-h-screen bg-zinc-100 text-zinc-950 dark:bg-zinc-950 dark:text-zinc-50">
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur dark:bg-zinc-950/90">
        <div className="mx-auto flex h-14 max-w-7xl items-center gap-3 border-b border-zinc-200/80 px-4 dark:border-zinc-800">
          <Skeleton variant="line" className="h-6 w-16" />
          <div className="ml-auto flex items-center gap-2">
            <Skeleton variant="rect" className="h-7 w-24 rounded-full" />
            <Skeleton variant="rect" className="size-9 rounded-md" />
            <Skeleton variant="rect" className="h-9 w-28 rounded-md" />
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-7xl">
        <aside className="sticky top-14 hidden max-h-[calc(100vh-3.5rem)] w-56 shrink-0 self-start overflow-y-auto border-r border-zinc-200 px-3 py-5 dark:border-zinc-800 lg:block">
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, index) => (
              <Skeleton key={index} variant="rect" className="h-10 w-full rounded-lg" />
            ))}
          </div>
        </aside>

        <main className="min-w-0 flex-1 px-4 py-6">
          <div className="mb-6 space-y-2">
            <Skeleton variant="line" className="h-8 w-56" />
            <Skeleton variant="line" className="h-4 w-80 max-w-full" />
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} variant="rect" className="h-24 rounded-xl" />
            ))}
          </div>

          <Skeleton variant="rect" className="mt-6 h-64 rounded-xl" />
        </main>
      </div>
    </div>
  );
}
