# Seniority and Confidence Stat Badges — Design Spec

**Date:** 2026-05-16  
**Jira:** KAN-8  
**Branch:** feat/KAN-8-Seniority-and-Confidence-badges  
**Status:** Approved

---

## Problem

`Seniority: Senior · Confidence: 95%` is the most important output of Step 1 but is rendered as plain secondary text (`text-sm text-slate-400`) with the same visual weight as supporting copy. Users may miss the key result entirely.

---

## Solution

Replace the plain text line with two distinct stat badge card components placed **above** the skill chips in the result card. Color adapts dynamically to the seniority level and confidence percentage.

---

## Component Architecture

**File:** `src/web/src/components/ui/StatBadge.tsx`

### `StatBadge` (generic base)

| Prop | Type | Description |
|------|------|-------------|
| `label` | `string` | Uppercase label, e.g. `"SENIORITY"` |
| `value` | `string` | Bold display value, e.g. `"Senior"` |
| `colorScheme` | `'purple' \| 'blue' \| 'gray' \| 'green' \| 'yellow' \| 'red'` | Controls tint and border color |

Styling: colored background tint, matching border, `border-radius: 10px`, padding `18px 12px`. Label at 9px uppercase, value at 20px bold.

### `SeniorityBadge` (wrapper)

| Prop | Type |
|------|------|
| `level` | `string` |

Color mapping:

| Level | Color scheme |
|-------|-------------|
| Senior, Software Designer, Architect | `purple` |
| Semi Senior, Semi Senior Adv | `blue` |
| Trainee, Trainee advance, Junior, Junior Advance (default) | `gray` |

Renders: `<StatBadge label="SENIORITY" value={level} colorScheme={derived} />`

> **Implementation note:** Level matching must use `.toLowerCase().trim()` — the AI agent may return level strings with minor casing variations.

### `ConfidenceBadge` (wrapper)

| Prop | Type |
|------|------|
| `confidence` | `number` (0–1) |

Color mapping:

| Range | Color scheme |
|-------|-------------|
| ≥ 0.80 | `green` |
| 0.60–0.79 | `yellow` |
| < 0.60 | `red` |

Renders: `<StatBadge label="CONFIDENCE" value={`${Math.round(confidence * 100)}%`} colorScheme={derived} />`

---

## Result Card Layout Change

**File:** `src/web/src/pages/AnalyzeStep.tsx`

### Before (result card order)
1. "✓ Analysis Complete"
2. Candidate name / title / years
3. Skill chips
4. Plain text: `Seniority: Senior · Confidence: 95%` ← **removed**
5. Red flags
6. Next button

### After
1. "✓ Analysis Complete"
2. Candidate name / title / years
3. **`<SeniorityBadge level={...} />` + `<ConfidenceBadge confidence={...} />`** in a `flex gap-3` row ← **new**
4. Skill chips
5. Red flags
6. Next button

The plain text block (lines 148–155) is removed entirely and replaced by the badge row.

---

## Testing

**File:** `src/web/src/components/ui/StatBadge.test.tsx`

Framework: Vitest + Testing Library (matches existing `AnalyzeStep.test.tsx` pattern).

### Test cases

**`StatBadge`**
- Renders `label` text
- Renders `value` text

**`SeniorityBadge`**
- "Senior" → purple classes present
- "Architect" → purple classes present
- "Software Designer" → purple classes present
- "Semi Senior" → blue classes present
- "Semi Senior Adv" → blue classes present
- "Junior" → gray classes present
- Unknown/unrecognized value → gray classes (default)

**`ConfidenceBadge`**
- 0.95 (95%) → green classes
- 0.80 (boundary) → green classes
- 0.70 (70%) → yellow classes
- 0.60 (boundary) → yellow classes
- 0.45 (45%) → red classes

---

## Acceptance Criteria (from KAN-8)

- [ ] Two badge components (`SeniorityBadge`, `ConfidenceBadge`) exist in `src/web/src/components/ui/StatBadge.tsx`
- [ ] Seniority badge color adapts per level: purple (Senior/Architect/Software Designer), blue (Semi Senior/Semi Senior Adv), gray (Junior/Trainee variants)
- [ ] Confidence badge color adapts: green (≥80%), yellow (60–79%), red (<60%)
- [ ] Badges are displayed prominently above the skill tags in the result card
- [ ] Plain text seniority/confidence line is removed from `AnalyzeStep.tsx`
- [ ] Unit tests pass for all color-mapping branches and boundary values

---

## Files Changed

| File | Change |
|------|--------|
| `src/web/src/components/ui/StatBadge.tsx` | New — generic base + two typed wrappers |
| `src/web/src/components/ui/StatBadge.test.tsx` | New — unit tests |
| `src/web/src/pages/AnalyzeStep.tsx` | Update — replace plain text with badge row, reorder card sections |
