type FormMessageProps = {
  error?: string;
  message?: string;
};

export function FormMessage({ error, message }: FormMessageProps) {
  if (!error && !message) {
    return null;
  }

  return (
    <div
      className={
        error
          ? "rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive-foreground"
          : "rounded-md border border-primary/40 bg-primary/10 px-3 py-2 text-sm text-primary"
      }
    >
      {error ?? message}
    </div>
  );
}
