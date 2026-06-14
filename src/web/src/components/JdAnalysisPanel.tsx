import { useJdMatch } from '@/store/JdMatchContext'
import { MatchScoreRing } from '@/components/ui/MatchScoreRing'
import { Button } from '@/components/ui/button'

function clampConfidence(confidence: number): number {
  if (!Number.isFinite(confidence)) return 0
  return Math.min(Math.max(confidence, 0), 1)
}

export function JdAnalysisPanel() {
  const { state } = useJdMatch()
  const result = state.analysisResult
  if (!result) return null

  const totalSkills = result.mustHave.length + result.niceToHave.length
  const confidencePercent = Math.round(clampConfidence(result.confidence) * 100)

  return (
    <div className="space-y-6">
      {/* Status badge */}
      <span className="inline-flex items-center gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-3 py-1.5 text-sm font-medium text-emerald-400">
        ✓ Analysis complete
      </span>

      {/* 3 metric cards */}
      <div className="grid grid-cols-3 gap-4">
        {/* Score ring card */}
        <div className="rounded-2xl border border-border bg-card p-5">
          <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            JD Quality Score
          </p>
          <div className="flex items-center gap-4">
            <MatchScoreRing score={result.score} />
            <div>
              <p className="text-sm font-semibold text-foreground">
                {result.score >= 80 ? 'Well-structured' : result.score >= 60 ? 'Satisfactory' : 'Needs clarity'}
              </p>
              <p className="text-xs text-muted-foreground">
                Confidence: {confidencePercent}%
              </p>
            </div>
          </div>
        </div>

        {/* Seniority card */}
        <div className="rounded-2xl border border-border bg-card p-5">
          <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Detected Seniority
          </p>
          <p className="text-3xl font-bold text-[#7c5cfc]" data-testid="seniority-label">
            {result.seniority}
          </p>
          <span className="mt-2 inline-flex items-center rounded-lg bg-[#7c5cfc]/10 px-2.5 py-1 text-xs font-medium text-[#7c5cfc]">
            {totalSkills} skills detected
          </span>
        </div>

        {/* Confidence card */}
        <div className="rounded-2xl border border-border bg-card p-5">
          <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Extraction Confidence
          </p>
          <p className="text-3xl font-bold text-emerald-400" data-testid="confidence-label">
            {confidencePercent}%
          </p>
          <span className="mt-2 inline-flex items-center rounded-lg bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-400">
            {totalSkills} skills detected
          </span>
        </div>
      </div>

      {/* Must-have chips */}
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Must-Have Technologies
        </p>
        <div className="flex flex-wrap gap-2" data-testid="must-have-chips">
          {result.mustHave.map((skill) => (
            <span
              key={skill}
              className="rounded-lg border border-[#7c5cfc]/40 bg-[#7c5cfc]/10 px-3 py-1 text-xs font-medium text-[#7c5cfc]"
            >
              {skill}
            </span>
          ))}
        </div>
      </div>

      {/* Nice-to-have chips */}
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Nice-to-Have Technologies
        </p>
        <div className="flex flex-wrap gap-2" data-testid="nice-to-have-chips">
          {result.niceToHave.map((skill) => (
            <span
              key={skill}
              className="rounded-lg border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground"
            >
              {skill}
            </span>
          ))}
        </div>
      </div>

      {/* JD summary */}
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          JD Summary
        </p>
        <div className="rounded-2xl border border-border bg-card p-5">
          <p className="text-sm leading-relaxed text-muted-foreground">{result.summary}</p>
        </div>
      </div>

      {/* Stub CTA — KAN-21 */}
      <Button disabled className="bg-indigo-600 disabled:opacity-50">
        Match Candidates →
      </Button>
    </div>
  )
}
