import { Button, Card, CardContent, Stack, Typography } from '@mui/material'
import { Link as RouterLink } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Package, ShoppingBag, RotateCcw } from 'lucide-react'
import { PageHeader } from '@/components/feedback/PageHeader'
import { StatusChip } from '@/components/feedback/StatusChip'
import { getErrorMessage } from '@/api/client'
import { ordersApi } from '@/api/orders.api'
import { useAuth } from '@/features/auth/AuthContext'

const fmt = (n: number) =>
  `${n.toLocaleString('uk-UA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₴`

export function CustomerHomePage() {
  const { user } = useAuth()
  const { data, isLoading, error } = useQuery({
    queryKey: ['customer-orders-home'],
    queryFn: () => ordersApi.list({ page: 1, pageSize: 5 }),
  })

  const active = (data?.items ?? []).filter(
    (o) => !['Cancelled', 'Completed'].includes(o.statusCode),
  )

  return (
    <>
      <PageHeader
        title={`Вітаємо, ${user?.firstName ?? 'клієнте'}!`}
        description="Кабінет клієнта TechStore"
      />

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 3 }}>
        <Button variant="contained" startIcon={<ShoppingBag size={16} />} component={RouterLink} to="/app/catalog">
          Каталог
        </Button>
        <Button variant="outlined" startIcon={<Package size={16} />} component={RouterLink} to="/app/orders">
          Мої замовлення
        </Button>
        <Button variant="outlined" startIcon={<RotateCcw size={16} />} component={RouterLink} to="/app/returns">
          Повернення
        </Button>
      </Stack>

      <Typography variant="h6" sx={{ mb: 1.5 }}>
        Активні замовлення
      </Typography>

      {error && (
        <Typography color="error" variant="body2">
          {getErrorMessage(error)}
        </Typography>
      )}
      {isLoading && <Typography variant="body2">Завантаження…</Typography>}
      {!isLoading && active.length === 0 && (
        <Typography color="text.secondary" variant="body2">
          Немає активних замовлень.{' '}
          <RouterLink to="/app/catalog">Перейти до каталогу</RouterLink>
        </Typography>
      )}

      <Stack spacing={1.5}>
        {active.map((o) => (
          <Card key={o.id} variant="outlined" component={RouterLink} to={`/app/orders/${o.id}`} sx={{ textDecoration: 'none' }}>
            <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
              <Stack direction="row" spacing={2} sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
                <Stack>
                  <Typography sx={{ fontWeight: 600 }}>{o.orderNumber}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {new Date(o.createdAt).toLocaleString('uk-UA')} · {fmt(o.totalAmount)}
                  </Typography>
                </Stack>
                <StatusChip label={o.statusName} status={o.statusCode} />
              </Stack>
            </CardContent>
          </Card>
        ))}
      </Stack>
    </>
  )
}
