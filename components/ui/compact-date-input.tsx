"use client"

import type { ComponentProps } from "react"
import { Input } from "@/components/ui/input"
import { formatCompactDateInput } from "@/lib/compact-date"

type Props = Omit<ComponentProps<typeof Input>, "type" | "inputMode" | "maxLength" | "pattern" | "value" | "onChange"> & {
  value: string
  onValueChange: (value: string) => void
  optional?: boolean
}

export function CompactDateInput({ value, onValueChange, optional = false, placeholder = "JJMMAAAA", ...props }: Props) {
  return <Input {...props} type="text" inputMode="numeric" autoComplete="off" maxLength={10} pattern={optional ? "(?:[0-9]{2}/[0-9]{2}/[0-9]{4})?" : "[0-9]{2}/[0-9]{2}/[0-9]{4}"} title="Saisissez uniquement 8 chiffres ; les séparateurs sont ajoutés automatiquement" placeholder={placeholder} value={value} onChange={(event) => onValueChange(formatCompactDateInput(event.target.value))} />
}
