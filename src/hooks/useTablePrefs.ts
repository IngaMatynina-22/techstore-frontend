import { useCallback, useMemo, useState } from 'react'

export interface TablePrefs {
  pageSize: number
  hiddenColumns: string[]
}

const PREFIX = 'techstore.table.'

function read(tableId: string, defaults: TablePrefs): TablePrefs {
  try {
    const raw = localStorage.getItem(PREFIX + tableId)
    if (!raw) return defaults
    const parsed = JSON.parse(raw) as Partial<TablePrefs>
    return {
      pageSize: typeof parsed.pageSize === 'number' ? parsed.pageSize : defaults.pageSize,
      hiddenColumns: Array.isArray(parsed.hiddenColumns) ? parsed.hiddenColumns : defaults.hiddenColumns,
    }
  } catch {
    return defaults
  }
}

function write(tableId: string, prefs: TablePrefs) {
  try {
    localStorage.setItem(PREFIX + tableId, JSON.stringify(prefs))
  } catch {
    /* ignore */
  }
}

export function useTablePrefs(tableId: string, defaultPageSize = 20) {
  const defaults = useMemo<TablePrefs>(
    () => ({ pageSize: defaultPageSize, hiddenColumns: [] }),
    [defaultPageSize],
  )
  const [prefs, setPrefs] = useState<TablePrefs>(() => read(tableId, defaults))

  const setPageSize = useCallback(
    (pageSize: number) => {
      setPrefs((prev) => {
        const next = { ...prev, pageSize }
        write(tableId, next)
        return next
      })
    },
    [tableId],
  )

  const toggleColumn = useCallback(
    (columnId: string) => {
      setPrefs((prev) => {
        const hidden = prev.hiddenColumns.includes(columnId)
          ? prev.hiddenColumns.filter((c) => c !== columnId)
          : [...prev.hiddenColumns, columnId]
        const next = { ...prev, hiddenColumns: hidden }
        write(tableId, next)
        return next
      })
    },
    [tableId],
  )

  const isHidden = useCallback((columnId: string) => prefs.hiddenColumns.includes(columnId), [prefs.hiddenColumns])

  return { prefs, setPageSize, toggleColumn, isHidden }
}
