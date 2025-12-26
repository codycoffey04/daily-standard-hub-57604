# Export Function Registration Causing Infinite Re-renders (React Error #310)

## Issue
After fixing export functionality, the application crashes with React error #310 (Maximum update depth exceeded / infinite re-renders).

## Recent Changes Made
1. Added `handleExportReady` wrapper function in `SummariesPage.tsx` using `useCallback`:
   ```typescript
   const handleExportReady = useCallback((exportFn: (() => void) | null) => {
     setExportFunction(() => exportFn || null)
   }, [])
   ```

2. Export registration pattern in reports (e.g., ExecutionFunnelReport, ZipCodePerformanceReport):
   ```typescript
   // Store export function in ref
   const exportToCSVRef = useRef(exportToCSV)
   exportToCSVRef.current = exportToCSV

   // Create stable wrapper
   const stableExportWrapperRef = useRef<(() => void) | null>(null)
   if (!stableExportWrapperRef.current) {
     stableExportWrapperRef.current = () => {
       exportToCSVRef.current()
     }
   }

   // Register export function
   useEffect(() => {
     if (onExportReady && stableExportWrapperRef.current) {
       onExportReady(stableExportWrapperRef.current)
     }
     return () => {
       if (onExportReady) {
         onExportReady(null)
       }
     }
   }, [onExportReady])
   ```

## Problem
The `handleExportReady` function is being called during render or causing state updates that trigger re-renders, which call it again, causing an infinite loop.

## Files Involved
- `src/pages/SummariesPage.tsx` - `handleExportReady` function
- `src/components/reports/ExecutionFunnelReport.tsx` - Export registration
- All other report components with export functionality

## Request
Please fix the export registration pattern to prevent infinite re-renders while maintaining:
1. Export functions only trigger on explicit button clicks (not on date changes)
2. Export functions are properly registered and available when Export button is clicked
3. No infinite re-render loops

The pattern should work reliably across all report components.

