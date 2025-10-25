import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Info } from "lucide-react"

export function ReviewsEmptyState() {
  return (
    <Alert>
      <Info className="h-4 w-4" />
      <AlertTitle>No reviews yet</AlertTitle>
      <AlertDescription>
        Crystal needs to review daily entries to generate insights. Once reviews are added,
        these reports will populate automatically.
      </AlertDescription>
    </Alert>
  )
}
