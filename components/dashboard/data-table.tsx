"use client"

import { useEffect, useId, useState } from "react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Search,
  ChevronLeft,
  ChevronRight,
  Eye,
} from "lucide-react"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { formatDateField } from "@/lib/date-format"
import { getDataTableRowKey } from "@/lib/data-table-row-key"

export interface Column<T> {
  key: keyof T | string
  header: string
  render?: (item: T) => React.ReactNode
  className?: string
}

export interface Filter {
  key: string
  label: string
  allLabel?: string
  options: { value: string; label: string }[]
}

interface DataTableProps<T> {
  showFilterLabels?: boolean
  data: T[]
  columns: Column<T>[]
  filters?: Filter[]
  searchPlaceholder?: string
  detailHref?: (item: T) => string
  onExportPDF?: () => void
  idKey?: keyof T | string
  tableClassName?: string
  actionsClassName?: string
  filterValues?: Record<string, string>
  onFilterValuesChange?: (next: Record<string, string>) => void
  renderActions?: (item: T) => React.ReactNode
  renderMobileCard?: (item: T) => React.ReactNode
}

function getValue<T extends object>(item: T, key: keyof T | string): unknown {
  return item[String(key) as keyof T]
}

export function DataTable<T extends object>({
  showFilterLabels = false,
  data,
  columns,
  filters = [],
  searchPlaceholder = "Rechercher...",
  detailHref,
  onExportPDF,
  idKey = "id" as keyof T,
  tableClassName,
  actionsClassName,
  filterValues: controlledFilterValues,
  onFilterValuesChange,
  renderActions,
  renderMobileCard,
}: DataTableProps<T>) {
  const toolbarId = useId()
  const [search, setSearch] = useState("")
  const [uncontrolledFilterValues, setUncontrolledFilterValues] = useState<Record<string, string>>({})
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [sort, setSort] = useState<{ key: string; direction: 1 | -1 } | null>(null)

  const filterValues = controlledFilterValues ?? uncontrolledFilterValues

  const setFilterValues = (updater: (prev: Record<string, string>) => Record<string, string>) => {
    const prev = filterValues
    const next = updater(prev)
    if (onFilterValuesChange) {
      onFilterValuesChange(next)
      return
    }
    setUncontrolledFilterValues(next)
  }

  // Filter and search data
  const filteredData = data.filter((item) => {
    // Search filter
    const searchMatch = Object.values(item as Record<string, unknown>).some((value) =>
      String(value).toLowerCase().includes(search.toLowerCase())
    )
    if (!searchMatch) return false

    // Apply filters
    for (const [key, filterValue] of Object.entries(filterValues)) {
      if (filterValue && filterValue !== "all") {
        if (String(getValue(item, key)) !== filterValue) {
          return false
        }
      }
    }
    return true
  })

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredData.length / pageSize))
  useEffect(() => setCurrentPage(page => Math.min(page, totalPages)), [totalPages])
  const sortedData = sort ? [...filteredData].sort((left, right) => String(getValue(left, sort.key) ?? "").localeCompare(String(getValue(right, sort.key) ?? ""), "fr", { numeric: true, sensitivity: "base" }) * sort.direction) : filteredData
  const startIndex = (currentPage - 1) * pageSize
  const paginatedData = sortedData.slice(startIndex, startIndex + pageSize)

  return (
    <div className="min-w-0 space-y-4">
      {/* Search and Filters */}
      <div className={cn("flex flex-wrap gap-4", showFilterLabels ? "items-end" : "items-center")}>
        <div className="min-w-[200px] max-w-md flex-1 space-y-2">
        {showFilterLabels && <label htmlFor={`${toolbarId}-search`} className="text-sm font-medium">Recherche</label>}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id={`${toolbarId}-search`}
            type="search"
            placeholder={searchPlaceholder}
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setCurrentPage(1)
            }}
            className="pl-9"
          />
        </div>
        </div>

        {filters.map((filter) => (
          <div key={filter.key} className="space-y-2">
          {showFilterLabels && <label htmlFor={`${toolbarId}-${filter.key}`} className="text-sm font-medium">{filter.label}</label>}
          <Select
            value={filterValues[filter.key] || "all"}
            onValueChange={(value) => {
              setFilterValues((prev) => ({ ...prev, [filter.key]: value }))
              setCurrentPage(1)
            }}
          >
            <SelectTrigger id={`${toolbarId}-${filter.key}`} className={filter.allLabel ? "w-[220px]" : "w-[180px]"} aria-label={filter.label}>
              <SelectValue placeholder={filter.label} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{filter.allLabel || "Tous"}</SelectItem>
              {filter.options.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          </div>
        ))}

        {onExportPDF && null}
      </div>

      {/* Table */}
      {renderMobileCard ? <div className="grid min-w-0 grid-cols-1 gap-3 md:hidden">{paginatedData.length ? paginatedData.map((item, index) => <div className="min-w-0" key={getDataTableRowKey(item, idKey, index)}>{renderMobileCard(item)}</div>) : <p className="rounded-lg border p-6 text-center text-sm text-muted-foreground">Aucune donnée trouvée</p>}</div> : null}
      <div className={cn("overflow-hidden rounded-xl border border-border/80 bg-card/90 shadow-[0_12px_30px_rgba(1,10,20,0.12)]", renderMobileCard && "hidden md:block")}>
        <Table className={tableClassName}>
          <TableHeader>
            <TableRow className="bg-muted/70 hover:bg-muted/70">
              {columns.map((column) => (
                <TableHead
                  key={String(column.key)}
                  aria-sort={sort?.key === String(column.key) ? sort.direction === 1 ? "ascending" : "descending" : "none"}
                  className={cn("font-semibold", column.className)}
                >
                  <button type="button" className="inline-flex items-center gap-1 text-left" onClick={() => { setSort(current => ({ key: String(column.key), direction: current?.key === String(column.key) && current.direction === 1 ? -1 : 1 })); setCurrentPage(1) }} aria-label={`Trier par ${column.header}`}>{column.header}{sort?.key === String(column.key) ? sort.direction === 1 ? " ↑" : " ↓" : ""}</button>
                </TableHead>
              ))}
              {(detailHref || renderActions) && (
                <TableHead className={cn("w-[100px] text-center", actionsClassName)}>Actions</TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedData.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length + (detailHref || renderActions ? 1 : 0)}
                  className="h-24 text-center text-muted-foreground"
                >
                  Aucune donnée trouvée
                </TableCell>
              </TableRow>
            ) : (
              paginatedData.map((item, index) => (
                <TableRow key={getDataTableRowKey(item, idKey, index)} className="hover:bg-muted/30">
                  {columns.map((column) => (
                    <TableCell
                      key={String(column.key)}
                      className={column.className}
                    >
                      {column.render
                        ? column.render(item)
                        : formatDateField(getValue(item, column.key), String(column.key), column.header)}
                    </TableCell>
                  ))}
                  {(detailHref || renderActions) && (
                    <TableCell className={cn("text-center", actionsClassName)}>
                      <div className="flex items-center justify-center gap-1">{detailHref ? <Button asChild variant="ghost" size="icon-sm">
                        <Link href={detailHref(item)} aria-label="Voir le détail" title="Voir le détail">
                          <Eye className="h-4 w-4" />
                        </Link>
                      </Button> : null}{renderActions?.(item)}</div>
                    </TableCell>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>Afficher</span>
          <Select
            value={String(pageSize)}
            onValueChange={(value) => {
              setPageSize(Number(value))
              setCurrentPage(1)
            }}
          >
            <SelectTrigger className="w-[70px]" aria-label="Nombre de lignes par page">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="10">10</SelectItem>
              <SelectItem value="25">25</SelectItem>
              <SelectItem value="50">50</SelectItem>
              <SelectItem value="100">100</SelectItem>
            </SelectContent>
          </Select>
          <span>
            sur {filteredData.length} résultat{filteredData.length > 1 ? "s" : ""}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            aria-label="Page précédente"
            disabled={currentPage === 1}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {currentPage} sur {totalPages || 1}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            aria-label="Page suivante"
            disabled={currentPage === totalPages || totalPages === 0}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
