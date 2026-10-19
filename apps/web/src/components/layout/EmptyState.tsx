export type EmptyStateProps = {
  title: string;
  description?: string;
};

export function EmptyState({ title, description }: EmptyStateProps) {
  return (
    <div className="border-border text-muted-foreground rounded-md border border-dashed p-10 text-center">
      <p className="text-foreground text-lg font-light">{title}</p>
      {description ? <p className="mt-1 text-sm">{description}</p> : null}
    </div>
  );
}
