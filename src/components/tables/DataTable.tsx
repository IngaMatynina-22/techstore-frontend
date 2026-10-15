import {
  Box,
  Button,
  Checkbox,
  CircularProgress,
  ListItemText,
  Menu,
  MenuItem,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  Typography,
} from '@mui/material'
import { Columns3 } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { EmptyState, QueryError } from '@/components/feedback/EmptyState'

export interface Column<T> {
  id: string
  label: string
  width?: number | string
  align?: 'left' | 'right' | 'center'
  hideable?: boolean
  render: (row: T) => ReactNode
}

export function DataTable<T>({
  columns,
  rows,
  rowKey,
  loading,
  error,
  onRetry,
  emptyTitle,
  emptyDescription,
  page,
  pageSize,
  totalCount,
  onPageChange,
  onPageSizeChange,
  onRowClick,
  hiddenColumnIds,
  onToggleColumn,
  toolbar,
}: {
  columns: Column<T>[]
  rows: T[]
  rowKey: (row: T) => string | number
  loading?: boolean
  error?: string | null
  onRetry?: () => void
  emptyTitle?: string
  emptyDescription?: string
  page: number
  pageSize: number
  totalCount: number
  onPageChange: (page: number) => void
  onPageSizeChange?: (size: number) => void
  onRowClick?: (row: T) => void
  hiddenColumnIds?: string[]
  onToggleColumn?: (columnId: string) => void
  toolbar?: ReactNode
}) {
  const [colAnchor, setColAnchor] = useState<null | HTMLElement>(null)
  const hidden = new Set(hiddenColumnIds ?? [])
  const visible = columns.filter((c) => !hidden.has(c.id))
  const hideable = columns.filter((c) => c.hideable !== false)

  if (error) return <QueryError message={error} onRetry={onRetry} />

  return (
    <Paper sx={{ overflow: 'hidden' }}>
      {(toolbar || onToggleColumn) && (
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 1, px: 1.5, pt: 1.5 }}>
          {toolbar}
          {onToggleColumn && (
            <>
              <Button
                size="small"
                startIcon={<Columns3 size={14} />}
                onClick={(e) => setColAnchor(e.currentTarget)}
              >
                Колонки
              </Button>
              <Menu anchorEl={colAnchor} open={!!colAnchor} onClose={() => setColAnchor(null)}>
                {hideable.map((c) => (
                  <MenuItem key={c.id} dense onClick={() => onToggleColumn(c.id)}>
                    <Checkbox size="small" checked={!hidden.has(c.id)} />
                    <ListItemText primary={c.label} />
                  </MenuItem>
                ))}
              </Menu>
            </>
          )}
        </Box>
      )}
      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              {visible.map((c) => (
                <TableCell key={c.id} align={c.align} sx={{ width: c.width }}>
                  {c.label}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={Math.max(visible.length, 1)} align="center" sx={{ py: 6 }}>
                  <CircularProgress size={28} />
                </TableCell>
              </TableRow>
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={Math.max(visible.length, 1)}>
                  <EmptyState title={emptyTitle} description={emptyDescription} />
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row) => (
                <TableRow
                  key={rowKey(row)}
                  hover={!!onRowClick}
                  sx={{ cursor: onRowClick ? 'pointer' : 'default' }}
                  onClick={() => onRowClick?.(row)}
                >
                  {visible.map((c) => (
                    <TableCell
                      key={c.id}
                      align={c.align}
                      onClick={(e) => {
                        if ((e.target as HTMLElement).closest('button,a,input')) e.stopPropagation()
                      }}
                    >
                      {c.render(row)}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 1 }}>
        <Typography variant="caption" color="text.secondary" sx={{ pl: 1 }}>
          Всього: {totalCount}
        </Typography>
        <TablePagination
          component="div"
          count={totalCount}
          page={Math.max(0, page - 1)}
          onPageChange={(_, p) => onPageChange(p + 1)}
          rowsPerPage={pageSize}
          onRowsPerPageChange={
            onPageSizeChange ? (e) => onPageSizeChange(parseInt(e.target.value, 10)) : undefined
          }
          rowsPerPageOptions={onPageSizeChange ? [10, 20, 50, 100] : [pageSize]}
          labelRowsPerPage="На сторінці"
        />
      </Box>
    </Paper>
  )
}
