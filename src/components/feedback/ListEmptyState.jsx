import { EmptyState } from "quickit-ui";

export default function ListEmptyState({ icon: Icon, title, description, actions }) {
  return (
    <EmptyState className="rounded-xl border border-dashed border-zinc-200/80 py-12 dark:border-zinc-800">
      {Icon && (
        <EmptyState.Icon>
          <Icon aria-hidden="true" className="size-5" />
        </EmptyState.Icon>
      )}
      <EmptyState.Title>{title}</EmptyState.Title>
      {description && <EmptyState.Description>{description}</EmptyState.Description>}
      {actions && <EmptyState.Actions><div className="w-full text-center">{actions}</div></EmptyState.Actions>}
    </EmptyState>
  );
}
