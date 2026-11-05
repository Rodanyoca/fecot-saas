import { AlertCircle } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

export function DataLoadNotice({ visible, title = "Données partiellement indisponibles", description }: { visible: boolean; title?: string; description: string }) {
  if (!visible) return null
  return <Alert variant="destructive"><AlertCircle className="size-4" /><AlertTitle>{title}</AlertTitle><AlertDescription>{description}</AlertDescription></Alert>
}
