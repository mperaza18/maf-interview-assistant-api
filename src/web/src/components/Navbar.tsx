import { ThemeToggle } from '@/components/ui/ThemeToggle'

interface NavbarProps {
  onBack?: () => void
}

export function Navbar({ onBack }: NavbarProps) {
  return (
    <div className="mb-6 flex items-center justify-between">
      {onBack ? (
        <button
          type="button"
          onClick={onBack}
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          ← Sessions
        </button>
      ) : (
        <div className="w-24" />
      )}
      <h1 className="text-lg font-bold text-foreground">Interview Assistant</h1>
      <ThemeToggle />
    </div>
  )
}
