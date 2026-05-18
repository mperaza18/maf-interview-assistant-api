interface CandidateChipsProps {
  role: string
  yearsExperience?: number
  topSkills: string[]
}

export function CandidateChips({ role, yearsExperience, topSkills }: CandidateChipsProps) {
  const displaySkills = topSkills.slice(0, 3).join(' · ')
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="inline-flex items-center rounded-full border border-violet-700/50 bg-violet-900/40 px-3 py-1 text-xs font-medium text-violet-300">
        {role}
      </span>
      {yearsExperience !== undefined && (
        <span className="inline-flex items-center rounded-full bg-slate-700 px-3 py-1 text-xs font-medium text-slate-300">
          {yearsExperience} yrs exp
        </span>
      )}
      {displaySkills && (
        <span className="inline-flex items-center rounded-full bg-slate-700 px-3 py-1 text-xs font-medium text-slate-300">
          {displaySkills}
        </span>
      )}
    </div>
  )
}
