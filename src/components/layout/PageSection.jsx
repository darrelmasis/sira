import { cn, EmptyStateTitle, FormDescription } from "quickit-ui";

export default function PageSection({ title, description, children, className }) {
  return (
    <section className={cn("space-y-3", className)}>
      {title && <EmptyStateTitle className="text-base font-semibold">{title}</EmptyStateTitle>}
      {description && <FormDescription className="mt-1">{description}</FormDescription>}
      {children && <div className={title || description ? "mt-3" : undefined}>{children}</div>}
    </section>
  );
}
