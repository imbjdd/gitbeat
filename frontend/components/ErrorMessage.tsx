interface ErrorMessageProps {
  error: string;
  className?: string;
}

export default function ErrorMessage({ error, className = "" }: ErrorMessageProps) {
  if (!error) return null;

  return (
    <div className={`bg-red-900/50 border border-red-500/50 rounded-md p-3 text-red-200 text-sm ${className}`}>
      ❌ {error}
    </div>
  );
}
