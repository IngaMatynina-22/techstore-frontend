import { useMemo, useState } from 'react'
import {
  Badge,
  Box,
  Divider,
  IconButton,
  List,
  ListItemButton,
  ListItemText,
  Menu,
  Typography,
} from '@mui/material'
import { Bell } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { inventoryApi } from '@/api/inventory.api'
import { purchaseOrdersApi } from '@/api/purchasing.api'
import { returnsApi } from '@/api/returns.api'

type Note = { id: string; title: string; detail: string; to: string }

export function NotificationCenter() {
  const navigate = useNavigate()
  const [anchor, setAnchor] = useState<null | HTMLElement>(null)

  const { data } = useQuery({
    queryKey: ['notifications'],
    refetchInterval: 60_000,
    queryFn: async () => {
      const [low, out, posConfirmed, posPartial, returns] = await Promise.allSettled([
        inventoryApi.lowStock({ page: 1, pageSize: 5 }),
        inventoryApi.outOfStock({ page: 1, pageSize: 5 }),
        purchaseOrdersApi.list({ status: 1, page: 1, pageSize: 5 }),
        purchaseOrdersApi.list({ status: 2, page: 1, pageSize: 5 }),
        returnsApi.list({ status: 0, page: 1, pageSize: 5 }),
      ])
      return { low, out, posConfirmed, posPartial, returns }
    },
  })

  const notes = useMemo(() => {
    const items: Note[] = []
    if (!data) return items

    if (data.low.status === 'fulfilled' && data.low.value.totalCount > 0) {
      items.push({
        id: 'low',
        title: `Низький залишок · ${data.low.value.totalCount}`,
        detail: data.low.value.items.map((i) => i.sku).slice(0, 3).join(', ') || 'Переглянути список',
        to: '/inventory/low-stock',
      })
    }
    if (data.out.status === 'fulfilled' && data.out.value.totalCount > 0) {
      items.push({
        id: 'out',
        title: `Немає в наявності · ${data.out.value.totalCount}`,
        detail: data.out.value.items.map((i) => i.sku).slice(0, 3).join(', ') || 'Переглянути список',
        to: '/inventory/out-of-stock',
      })
    }

    const poItems = [
      ...(data.posConfirmed.status === 'fulfilled' ? data.posConfirmed.value.items : []),
      ...(data.posPartial.status === 'fulfilled' ? data.posPartial.value.items : []),
    ]
    const poCount =
      (data.posConfirmed.status === 'fulfilled' ? data.posConfirmed.value.totalCount : 0) +
      (data.posPartial.status === 'fulfilled' ? data.posPartial.value.totalCount : 0)
    if (poCount > 0) {
      items.push({
        id: 'po',
        title: `Закупівлі на прийманні · ${poCount}`,
        detail: poItems.map((p) => p.orderNumber).slice(0, 3).join(', ') || 'Переглянути',
        to: '/purchasing/purchase-orders?status=1',
      })
    }

    if (data.returns.status === 'fulfilled' && data.returns.value.totalCount > 0) {
      items.push({
        id: 'ret',
        title: `Повернення очікують · ${data.returns.value.totalCount}`,
        detail: data.returns.value.items.map((r) => r.returnNumber).slice(0, 3).join(', ') || 'Переглянути',
        to: '/returns?status=0',
      })
    }
    return items
  }, [data])

  const count = notes.length

  return (
    <>
      <IconButton color="inherit" onClick={(e) => setAnchor(e.currentTarget)} aria-label="Сповіщення">
        <Badge badgeContent={count || undefined} color="primary" max={9}>
          <Bell size={18} />
        </Badge>
      </IconButton>
      <Menu
        anchorEl={anchor}
        open={!!anchor}
        onClose={() => setAnchor(null)}
        slotProps={{ paper: { sx: { width: 340, maxHeight: 420 } } }}
      >
        <Box sx={{ px: 2, py: 1.5 }}>
          <Typography sx={{ fontWeight: 600 }}>Сповіщення</Typography>
          <Typography variant="caption" color="text.secondary">
            Залишки, закупівлі та повернення
          </Typography>
        </Box>
        <Divider />
        {notes.length === 0 ? (
          <Box sx={{ p: 2 }}>
            <Typography variant="body2" color="text.secondary">
              Немає оперативних попереджень
            </Typography>
          </Box>
        ) : (
          <List dense disablePadding>
            {notes.map((n) => (
              <ListItemButton
                key={n.id}
                onClick={() => {
                  setAnchor(null)
                  navigate(n.to)
                }}
              >
                <ListItemText
                  primary={n.title}
                  secondary={n.detail}
                  slotProps={{
                    primary: { sx: { fontSize: 13, fontWeight: 600 } },
                    secondary: { sx: { fontSize: 12 }, noWrap: true },
                  }}
                />
              </ListItemButton>
            ))}
          </List>
        )}
      </Menu>
    </>
  )
}
