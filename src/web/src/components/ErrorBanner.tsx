interface ErrorBannerProps {
  message: string
  onDismiss?: () => void
}

export function ErrorBanner({ message, onDismiss }: ErrorBannerProps) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-md border border-red-500/30 bg-red-900/20 px-4 py-3 text-sm text-red-300">
      <span>{message}</span>
      {onDismiss && (
        <button
          onClick={onDismiss}
          className="shrink-0 text-red-400 hover:text-red-200 leading-none text-base"
          aria-label="Dismiss error"
        >
          ×
        </button>
      )}
    </div>
  )
}
