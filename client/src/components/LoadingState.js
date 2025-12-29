export default function LoadingState({ message = "Loading...", fullScreen = false }) {
  const containerClass = fullScreen 
    ? "flex h-screen items-center justify-center"
    : "flex h-full w-full items-center justify-center py-12";
  
  return (
    <div className={containerClass}>
      <div className="flex flex-col items-center gap-3">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        <p className="text-sm font-medium text-slate-600">{message}</p>
      </div>
    </div>
  );
}

