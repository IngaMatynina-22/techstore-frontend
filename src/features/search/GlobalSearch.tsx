import { useEffect, useMemo, useState } from 'react'
import {
  Autocomplete,
  Box,
  CircularProgress,
  ListItemText,
  TextField,
  Typography,
} from '@mui/material'
import { Search } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { productsApi } from '@/api/catalog.api'
import { ordersApi } from '@/api/orders.api'
import { suppliersApi } from '@/api/purchasing.api'

type SearchHit = {
  id: string
  group: 'Товари' | 'Замовлення' | 'Постачальники'
  label: string
  secondary?: string
  to: string
}

function useDebounced(value: string, ms = 300) {
  const [v, setV] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms)
    return () => clearTimeout(t)
  }, [value, ms])
  return v
}

export function GlobalSearch() {
  const navigate = useNavigate()
  const [input, setInput] = useState('')
  const q = useDebounced(input.trim())
  const enabled = q.length >= 2

  const { data, isFetching } = useQuery({
    queryKey: ['global-search', q],
    enabled,
    queryFn: async (): Promise<SearchHit[]> => {
      const [products, orders, suppliers] = await Promise.allSettled([
        productsApi.list({ search: q, page: 1, pageSize: 5 }),
        ordersApi.list({ orderNumber: q, page: 1, pageSize: 5 }),
        suppliersApi.list({ search: q, page: 1, pageSize: 5 }),
      ])

      const hits: SearchHit[] = []

      if (products.status === 'fulfilled') {
        for (const p of products.value.items) {
          hits.push({
            id: `p-${p.id}`,
            group: 'Товари',
            label: p.name,
            secondary: p.primarySku ?? p.categoryName,
            to: `/catalog/products/${p.id}`,
          })
        }
      }
      if (orders.status === 'fulfilled') {
        for (const o of orders.value.items) {
          hits.push({
            id: `o-${o.id}`,
            group: 'Замовлення',
            label: o.orderNumber,
            secondary: `${o.customerName} · ${o.statusName}`,
            to: `/orders/${o.id}`,
          })
        }
      }
      if (suppliers.status === 'fulfilled') {
        const list = Array.isArray(suppliers.value) ? suppliers.value : suppliers.value.items
        for (const s of list.slice(0, 5)) {
          hits.push({
            id: `s-${s.id}`,
            group: 'Постачальники',
            label: s.name,
            secondary: s.email ?? s.phone ?? undefined,
            to: `/purchasing/suppliers/${s.id}`,
          })
        }
      }
      return hits
    },
  })

  const options = useMemo(() => data ?? [], [data])

  return (
    <Autocomplete
      sx={{ flex: 1, maxWidth: 420, minWidth: 160 }}
      size="small"
      options={options}
      groupBy={(o) => o.group}
      getOptionLabel={(o) => o.label}
      filterOptions={(x) => x}
      loading={isFetching}
      inputValue={input}
      onInputChange={(_, v) => setInput(v)}
      onChange={(_, hit) => {
        if (hit) {
          navigate(hit.to)
          setInput('')
        }
      }}
      noOptionsText={enabled ? 'Нічого не знайдено' : 'Введіть мінімум 2 символи'}
      renderOption={(props, option) => (
        <Box component="li" {...props} key={option.id}>
          <ListItemText
            primary={option.label}
            secondary={option.secondary}
            slotProps={{
              primary: { sx: { fontSize: 14 } },
              secondary: { sx: { fontSize: 12 } },
            }}
          />
        </Box>
      )}
      renderInput={(params) => {
        // #region agent log
        const inputSlot = params.slotProps?.input as { ref?: unknown } | undefined
        const hasInputPropsRef = !!(params as { InputProps?: { ref?: unknown } }).InputProps?.ref
        const hasSlotRef = !!inputSlot?.ref
        fetch('http://127.0.0.1:7583/ingest/da68f0e7-cfae-419a-88ca-2a64f3dcc6e4',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'7481c3'},body:JSON.stringify({sessionId:'7481c3',runId:'pre-fix',hypothesisId:'E',location:'GlobalSearch.tsx:renderInput',message:'Autocomplete input ref check',data:{hasInputPropsRef,hasSlotRef,hasInputProps:!!(params as {InputProps?:unknown}).InputProps,hasSlotPropsInput:!!params.slotProps?.input},timestamp:Date.now()})}).catch(()=>{});
        // #endregion
        return (
        <TextField
          {...params}
          placeholder="Пошук товарів, замовлень, постачальників…"
          slotProps={{
            input: {
              ...params.slotProps?.input,
              startAdornment: (
                <Box sx={{ display: 'flex', alignItems: 'center', pl: 1, color: 'text.secondary' }}>
                  <Search size={16} />
                </Box>
              ),
              endAdornment: (
                <>
                  {isFetching ? <CircularProgress color="inherit" size={16} sx={{ mr: 1 }} /> : null}
                </>
              ),
            },
          }}
        />
        )
      }}
      renderGroup={(params) => (
        <li key={params.key}>
          <Typography
            variant="caption"
            sx={{ px: 2, py: 0.5, display: 'block', color: 'text.secondary', fontWeight: 600 }}
          >
            {params.group}
          </Typography>
          <ul style={{ padding: 0 }}>{params.children}</ul>
        </li>
      )}
    />
  )
}
