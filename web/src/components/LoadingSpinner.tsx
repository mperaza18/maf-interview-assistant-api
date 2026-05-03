interface LoadingSpinnerProps {
  label?: string
}

export function LoadingSpinner({ label = 'Loading...' }: LoadingSpinnerProps) {
  return (
    <div className="flex items-center gap-3 text-slate-400">
      <div className="h-5 w-5 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
      <span className="text-sm">{label}</span>
    </div>
  )
}
