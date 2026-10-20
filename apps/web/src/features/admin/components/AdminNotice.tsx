/** The status line an admin page shows after an action; renders nothing without a message. */
export function AdminNotice({ message }: { message: string | undefined }) {
  if (!message) return null;
  return (
    <p role="status" className="bg-card border-border rounded-md border p-3 text-sm">
      {message}
    </p>
  );
}
