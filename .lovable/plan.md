
# Plan: Fix Dark Mode Readability for CSR Dashboard Cards

## Problem
The CSR Dashboard has several cards where text becomes unreadable in dark mode because they use light-mode-only background colors (like `bg-green-50`, `bg-yellow-50`) that are too bright for dark backgrounds.

## Affected Components

### 1. PointsSummaryCard (Points Summary)
**File:** `src/components/csr/PointsSummaryCard.tsx`

**Issue:** Each activity row uses hardcoded light backgrounds:
- `bg-green-50`, `bg-blue-50`, `bg-yellow-50`, `bg-purple-50`, `bg-orange-50`, `bg-teal-50`, `bg-cyan-50`

**Fix:** Add dark mode variants to the activity type definitions:

```text
Before: bgColor: 'bg-green-50'
After:  bgColor: 'bg-green-50 dark:bg-green-950/50'
```

Apply to all 7 activity types with their corresponding dark backgrounds.

---

### 2. CSRLeaderboard (Leaderboard)
**File:** `src/components/csr/CSRLeaderboard.tsx`

**Issue:** The `getRankBgColor` function returns light-only backgrounds:
- Rank 1: `bg-yellow-50 border-yellow-200`
- Rank 2: `bg-gray-50 border-gray-200`
- Rank 3: `bg-amber-50 border-amber-200`

**Fix:** Update the function to include dark mode variants:

```text
case 1: 'bg-yellow-50 dark:bg-yellow-950/50 border-yellow-200 dark:border-yellow-800'
case 2: 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700'
case 3: 'bg-amber-50 dark:bg-amber-950/50 border-amber-200 dark:border-amber-800'
default: 'bg-background'
```

---

### 3. GoalProgressBar (Yearly Goal)
**File:** `src/components/csr/GoalProgressBar.tsx`

**Issue:** The "Goal Met!" text uses `text-green-600` which can be hard to read in dark mode.

**Fix:** Add dark mode variant:
```text
Before: text-green-600
After:  text-green-600 dark:text-green-400
```

---

## Summary of Changes

| Component | Lines to Change | Fix |
|-----------|----------------|-----|
| PointsSummaryCard | Lines 27, 34, 42, 49, 58, 66, 74 | Add `dark:bg-{color}-950/50` to each bgColor |
| CSRLeaderboard | Lines 37-43 (getRankBgColor function) | Add dark mode bg and border variants |
| GoalProgressBar | Line 47 | Add `dark:text-green-400` |

The pattern follows the existing dark mode styling in CoachingDashboardCard (which uses `bg-muted` with colored left borders) but maintains the current design approach for consistency within CSR components.
