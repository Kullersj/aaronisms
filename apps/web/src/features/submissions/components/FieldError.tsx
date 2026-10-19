export type FieldErrorProps = { message?: string };

export function FieldError({ message }: FieldErrorProps) {
  if (!message) return null;
  return (
    <p role="alert" className="text-sm text-red-600 dark:text-red-400">
      {message}
    </p>
  );
}
