import { cn } from '@/lib/utils'

type ColorScheme = 'purple' | 'blue' | 'gray' | 'green' | 'yellow' | 'red'

const colorClasses: Record<ColorScheme, string> = {
  purple: 'bg-purple-500/20 border-purple-500/40 text-purple-300',
  blue:   'bg-blue-500/20 border-blue-500/40 text-blue-300',
  gray:   'bg-slate-500/20 border-slate-500/40 text-slate-300',
  green:  'bg-emerald-500/20 border-emerald-500/40 text-emerald-300',
  yellow: 'bg-yellow-500/20 border-yellow-500/40 text-yellow-300',
  red:    'bg-red-500/20 border-red-500/40 text-red-300',
}

interface StatBadgeProps {
  label: string
  value: string
  colorScheme: ColorScheme
}

export function StatBadge({ label, value, colorScheme }: StatBadgeProps) {
  return (
    <div
      data-testid="stat-badge"
      className={cn(
        'flex flex-col items-center border px-3',
        'rounded-[10px]', // spec: border-radius 10px
        'py-[18px]', // spec: 18px vertical padding
        'min-w-[90px]', // spec: minimum width for badge layout consistency
        colorClasses[colorScheme]
      )}
    >
      <span className="uppercase tracking-wider opacity-70 text-[9px]">{label}</span>
      {/* spec: 9px label size */}
      <span className="font-bold leading-tight text-xl">{value}</span>
    </div>
  )
}

function getSeniorityColorScheme(level: string): ColorScheme {
  const normalized = level.toLowerCase().trim()
  if (['senior', 'software designer', 'architect'].includes(normalized)) return 'purple'
  if (['semi senior', 'semi senior adv'].includes(normalized)) return 'blue'
  return 'gray'
}

export function SeniorityBadge({ level }: { level: string }) {
  return (
    <StatBadge
      label="SENIORITY"
      value={level}
      colorScheme={getSeniorityColorScheme(level)}
    />
  )
}

const HIGH_CONFIDENCE = 0.8
const MID_CONFIDENCE = 0.6

function getConfidenceColorScheme(confidence: number): ColorScheme {
  if (confidence >= HIGH_CONFIDENCE) return 'green'
  if (confidence >= MID_CONFIDENCE) return 'yellow'
  return 'red'
}

function clampConfidence(confidence: number): number {
  if (!Number.isFinite(confidence)) return 0
  return Math.min(Math.max(confidence, 0), 1)
}

export function ConfidenceBadge({ confidence }: { confidence: number }) {
  const normalizedConfidence = clampConfidence(confidence)

  return (
    <StatBadge
      label="CONFIDENCE"
      value={`${Math.round(normalizedConfidence * 100)}%`}
      colorScheme={getConfidenceColorScheme(normalizedConfidence)}
    />
  )
}
