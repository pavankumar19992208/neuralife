import { useState, useEffect, useRef } from 'react'
import { Search, X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import type { StudentListFilters } from '@/types/common'

interface StudentFiltersProps {
  filters: StudentListFilters
  onChange: (filters: StudentListFilters) => void
}

type StatusView = 'ALL' | 'ACTIVE' | 'AT_RISK' | 'ALUMNI'

export default function StudentFilters({ filters, onChange }: StudentFiltersProps) {
  const [searchInput, setSearchInput] = useState(filters.search ?? '')
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Derive current status view from filter state
  const statusView: StatusView =
    filters._mastery_filter === 'AT_RISK'
      ? 'AT_RISK'
      : filters.status === 'ALUMNI'
        ? 'ALUMNI'
        : filters.status === 'ACTIVE'
          ? 'ACTIVE'
          : 'ALL'

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      onChange({ ...filters, search: searchInput || undefined })
    }, 350)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [searchInput])

  function handleStatusChange(value: StatusView) {
    const next = { ...filters }
    if (value === 'AT_RISK') {
      next.status = 'ACTIVE'
      next._mastery_filter = 'AT_RISK'
    } else if (value === 'ACTIVE') {
      next.status = 'ACTIVE'
      next._mastery_filter = undefined
    } else if (value === 'ALUMNI') {
      next.status = 'ALUMNI'
      next._mastery_filter = undefined
    } else {
      next.status = undefined
      next._mastery_filter = undefined
    }
    onChange(next)
  }

  function handleClassChange(value: string) {
    onChange({ ...filters, class_year: value === 'all' ? undefined : Number(value) })
  }

  function handleSectionChange(value: string) {
    onChange({ ...filters, section: value === 'all' ? undefined : value })
  }

  const hasActiveFilter =
    filters.class_year !== undefined ||
    filters.section !== undefined ||
    filters.status !== undefined ||
    filters._mastery_filter !== undefined ||
    (filters.search !== undefined && filters.search !== '')

  function clearAll() {
    setSearchInput('')
    onChange({})
  }

  return (
    <div className="flex items-center gap-3 flex-wrap">
      {/* Search */}
      <div className="relative w-56">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" aria-hidden="true" />
        <Input
          type="search"
          placeholder="Search by name…"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          className="pl-9 h-9"
          aria-label="Search students"
        />
      </div>

      {/* Class dropdown */}
      <Select
        value={filters.class_year !== undefined ? String(filters.class_year) : 'all'}
        onValueChange={handleClassChange}
      >
        <SelectTrigger className="w-36 h-9" aria-label="Filter by class">
          <SelectValue placeholder="All Classes" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Classes</SelectItem>
          {Array.from({ length: 10 }, (_, i) => i + 1).map((c) => (
            <SelectItem key={c} value={String(c)}>
              Class {c}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Section dropdown */}
      <Select
        value={filters.section ?? 'all'}
        onValueChange={handleSectionChange}
      >
        <SelectTrigger className="w-36 h-9" aria-label="Filter by section">
          <SelectValue placeholder="All Sections" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Sections</SelectItem>
          {['A', 'B', 'C', 'D', 'E', 'F'].map((s) => (
            <SelectItem key={s} value={s}>
              Section {s}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Status dropdown */}
      <Select value={statusView} onValueChange={(v) => handleStatusChange(v as StatusView)}>
        <SelectTrigger className="w-36 h-9" aria-label="Filter by status">
          <SelectValue placeholder="All" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="ALL">All</SelectItem>
          <SelectItem value="ACTIVE">Active</SelectItem>
          <SelectItem value="AT_RISK">AT_RISK</SelectItem>
          <SelectItem value="ALUMNI">Alumni</SelectItem>
        </SelectContent>
      </Select>

      {/* Clear filters */}
      {hasActiveFilter && (
        <Button
          variant="ghost"
          size="sm"
          onClick={clearAll}
          className="h-9 text-slate-500 hover:text-slate-700"
          aria-label="Clear all filters"
        >
          <X className="h-4 w-4 mr-1" aria-hidden="true" />
          Clear
        </Button>
      )}
    </div>
  )
}
