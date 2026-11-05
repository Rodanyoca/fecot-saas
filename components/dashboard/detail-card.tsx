import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { LucideIcon } from "lucide-react"
import { formatDateField } from "@/lib/date-format"
import { cn } from "@/lib/utils"

interface DetailField {
  label: string
  title?: string
  value: string | number | null | undefined
}

interface DetailCardProps {
  title: string
  icon?: LucideIcon
  fields: DetailField[]
  className?: string
  iconClassName?: string
  emptyMessage?: string
}

export function DetailCard({ title, icon: Icon, fields, className, iconClassName, emptyMessage }: DetailCardProps) {
  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          {Icon && <Icon className={cn("h-5 w-5 text-primary", iconClassName)} />}
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {emptyMessage && fields.every(field => !field.value) && <p className="text-sm text-muted-foreground">{emptyMessage}</p>}
        {fields.map((field, index) => (
          <div key={index} className="flex items-start justify-between gap-3">
            <span className="text-sm text-muted-foreground shrink-0">{field.label}</span>
            <span title={field.title} className="text-sm font-medium text-foreground text-right min-w-0 max-w-[70%] whitespace-normal break-words">
              {formatDateField(field.value, "", field.label)}
            </span>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
