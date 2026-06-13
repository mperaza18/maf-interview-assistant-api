import { Sparkles } from 'lucide-react'

interface PlaceholderProps {
  title: string
  description?: string
}

export function Placeholder({ title, description }: PlaceholderProps) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-sidebar-active-bg text-primary">
        <Sparkles size={24} aria-hidden />
      </div>
      <h1 className="text-2xl font-bold text-foreground">{title}</h1>
      <p className="mt-2 max-w-sm text-sm text-muted-foreground">
        {description ?? 'Coming soon.'}
      </p>
    </div>
  )
}
