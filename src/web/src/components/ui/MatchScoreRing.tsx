const RADIUS = 34
const CIRCUMFERENCE = 2 * Math.PI * RADIUS // ~213.63

interface MatchScoreRingProps {
  score: number // 0–100
}

export function MatchScoreRing({ score }: MatchScoreRingProps) {
  const offset = CIRCUMFERENCE * (1 - Math.min(100, Math.max(0, score)) / 100)

  return (
    <div className="relative" style={{ width: 80, height: 80 }}>
      <svg
        width="80"
        height="80"
        viewBox="0 0 80 80"
        aria-label={`JD quality score: ${score} out of 100`}
      >
        <circle cx="40" cy="40" r={RADIUS} fill="none" stroke="#1a2233" strokeWidth="8" />
        <circle
          cx="40"
          cy="40"
          r={RADIUS}
          fill="none"
          stroke="#7c5cfc"
          strokeWidth="8"
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform="rotate(-90 40 40)"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-xl font-bold leading-none text-foreground">{score}</span>
        <span className="text-[10px] text-muted-foreground">/100</span>
      </div>
    </div>
  )
}
