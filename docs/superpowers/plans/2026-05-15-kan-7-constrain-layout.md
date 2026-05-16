# KAN-7: Constrain and Center Layout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Narrow the root container to 760px and visually group the Upload PDF and Target Role inputs in a card on the Analyze step.

**Architecture:** Single container class change in `App.tsx` narrows all steps at once. A card wrapper div is added inside `AnalyzeStep.tsx` around the existing form grid — no logic changes.

**Tech Stack:** React 18, TypeScript, Tailwind CSS, Vitest + Testing Library

---

## File Map

| File | Change |
|------|--------|
| `src/web/src/App.tsx` | Change `max-w-4xl` → `max-w-[760px]` on the root container div |
| `src/web/src/pages/AnalyzeStep.tsx` | Wrap the form grid (Upload PDF + Target Role) in a card div |

---

### Task 1: Verify baseline tests pass

**Files:**
- Read: `src/web/src/pages/AnalyzeStep.test.tsx`

- [ ] **Step 1: Run the frontend test suite**

```bash
cd src/web && npm test -- --run
```

Expected output: all tests pass (5 tests in AnalyzeStep.test.tsx, plus any others).

- [ ] **Step 2: Confirm no pre-existing failures**

If any tests fail, stop and investigate before proceeding. The plan assumes a clean baseline.

---

### Task 2: Narrow the root container in App.tsx

**Files:**
- Modify: `src/web/src/App.tsx` (line 54 — the outermost `div` inside the return)

- [ ] **Step 1: Open `src/web/src/App.tsx` and find the container div**

It currently reads:
```tsx
<div className="mx-auto max-w-4xl px-4 py-8">
```

- [ ] **Step 2: Change `max-w-4xl` to `max-w-[760px]`**

Result:
```tsx
<div className="mx-auto max-w-[760px] px-4 py-8">
```

No other changes in this file.

- [ ] **Step 3: Run tests to confirm no regression**

```bash
cd src/web && npm test -- --run
```

Expected: same pass count as Task 1 baseline.

- [ ] **Step 4: Start the dev server and visually verify**

```bash
cd src/web && npm run dev
```

Open `http://localhost:5173`. On a wide browser window (>760px), content should be centered with empty space on both sides. Resize to ~768px — content should fill the viewport with only the `px-4` padding on each side.

- [ ] **Step 5: Commit**

```bash
git add src/web/src/App.tsx
git commit -m "feat: constrain root layout to 760px max-width (KAN-7)"
```

---

### Task 3: Card-wrap the form inputs in AnalyzeStep

**Files:**
- Modify: `src/web/src/pages/AnalyzeStep.tsx` (lines 62–117 — the top-level return div and the form grid inside it)

- [ ] **Step 1: Open `src/web/src/pages/AnalyzeStep.tsx` and locate the form grid**

The return currently starts with:
```tsx
return (
  <div className="space-y-6">
    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
      ...
    </div>
    {uploadStatus === 'uploading' && <LoadingSpinner ... />}
    {hasResult && ...}
  </div>
)
```

- [ ] **Step 2: Wrap the grid div in a card shell**

Replace the opening of the return with:
```tsx
return (
  <div className="space-y-6">
    <div className="rounded-lg border border-slate-700 bg-slate-800 p-4 space-y-4">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {/* existing Upload PDF column (md:col-span-2) unchanged */}
        {/* existing Target Role column unchanged */}
      </div>
    </div>
    {uploadStatus === 'uploading' && <LoadingSpinner label="Analyzing resume with AI..." />}
    {hasResult && session.profile && session.seniority && (
      ...existing result card unchanged...
    )}
  </div>
)
```

The complete updated return (full replacement, no logic changes):
```tsx
return (
  <div className="space-y-6">
    <div className="rounded-lg border border-slate-700 bg-slate-800 p-4 space-y-4">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="space-y-2 md:col-span-2">
          <label className="text-xs font-medium uppercase tracking-wide text-slate-400">
            Resume (PDF)
          </label>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf"
            onChange={handleFileChange}
            className="hidden"
            aria-label="Upload PDF resume"
          />
          <div className="flex items-center gap-3">
            <Button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadStatus === 'uploading'}
              className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50"
            >
              {uploadStatus === 'uploading' ? 'Uploading...' : 'Upload PDF'}
            </Button>
            {uploadStatus === 'success' && (
              <span className="flex items-center gap-1 text-sm text-emerald-400">
                <span>📄</span>
                <span>✓</span>
              </span>
            )}
            {uploadStatus === 'error' && (
              <span className="flex items-center gap-2 text-sm">
                <span>📄</span>
                <span className="text-red-400">✗</span>
                <button
                  onClick={handleRetry}
                  className="text-indigo-400 underline hover:text-indigo-300"
                >
                  Try another file
                </button>
              </span>
            )}
          </div>
          {uploadStatus === 'error' && errorMessage && (
            <p className="text-sm text-red-400">{errorMessage}</p>
          )}
        </div>
        <div className="space-y-2">
          <label className="text-xs font-medium uppercase tracking-wide text-slate-400">
            Target Role
          </label>
          <Input
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="border-slate-700 bg-slate-800 text-slate-100"
          />
        </div>
      </div>
    </div>

    {uploadStatus === 'uploading' && <LoadingSpinner label="Analyzing resume with AI..." />}

    {hasResult && session.profile && session.seniority && (
      <div className="space-y-3 rounded-lg border border-emerald-500/30 bg-slate-800 p-4">
        <div className="text-sm font-semibold text-emerald-400">✓ Analysis Complete</div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-medium text-slate-100">{session.profile.candidateName}</span>
          {session.profile.currentTitle && (
            <span className="text-slate-400">· {session.profile.currentTitle}</span>
          )}
          {session.profile.yearsExperience != null && (
            <span className="text-slate-400">· {session.profile.yearsExperience} yrs exp</span>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {session.profile.coreSkills.map((skill) => (
            <span
              key={skill}
              className="rounded-full bg-slate-700 px-2 py-0.5 text-xs text-slate-300"
            >
              {skill}
            </span>
          ))}
        </div>
        <div className="text-sm text-slate-400">
          Seniority:{' '}
          <span className="font-semibold text-indigo-400">{session.seniority.level}</span>
          {' · '}
          Confidence:{' '}
          <span className="text-slate-200">
            {Math.round(session.seniority.confidence * 100)}%
          </span>
        </div>
        {session.profile.redFlags.length > 0 && (
          <div className="text-sm text-amber-400">
            ⚠ Red flags: {session.profile.redFlags.join(', ')}
          </div>
        )}
        <div className="flex justify-end pt-1">
          <Button
            onClick={() => dispatch({ type: 'SET_STEP', step: 2 })}
            className="bg-indigo-600 hover:bg-indigo-700"
          >
            Next: Interview Plan →
          </Button>
        </div>
      </div>
    )}
  </div>
)
```

- [ ] **Step 3: Run the existing AnalyzeStep tests**

```bash
cd src/web && npm test -- --run src/pages/AnalyzeStep.test.tsx
```

Expected: 5 tests pass. The card wrapper is a plain `div` — none of the behavior tests query for it, so they are unaffected.

- [ ] **Step 4: Visually verify the card grouping**

In the running dev server at `http://localhost:5173`, start a new interview. On Step 1 (Analyze), the Upload PDF button and Target Role input should now appear together inside a card with a dark border and background, matching the analysis result card below it.

- [ ] **Step 5: Commit**

```bash
git add src/web/src/pages/AnalyzeStep.tsx
git commit -m "feat: group Upload PDF and Target Role in card (KAN-7)"
```

---

### Task 4: Final check and branch ready for PR

- [ ] **Step 1: Run the full frontend test suite one more time**

```bash
cd src/web && npm test -- --run
```

Expected: all tests pass.

- [ ] **Step 2: Confirm acceptance criteria**

| Criteria | How to verify |
|----------|--------------|
| All steps use 760px container | Resize browser past 760px — content stays centered with side padding |
| No full-width stretch on wide screens | At 1280px+ viewport, content is clearly centered |
| Upload PDF + Target Role in one card | Step 1 shows both fields in a bordered card |
| Responsive at 768px | DevTools mobile emulation at 768px — content fills width with 8px side padding |
