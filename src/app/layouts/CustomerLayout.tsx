import { Box, Button, Container, Stack, Typography, AppBar, Toolbar, Badge } from '@mui/material'
import { Link as RouterLink, NavLink, Outlet, useNavigate } from 'react-router-dom'
import { LogOut, Package, RotateCcw, ShoppingBag, Home } from 'lucide-react'
import { useAuth } from '@/features/auth/AuthContext'
import { useCart } from '@/features/customer/cart'

const nav = [
  { to: '/app', label: 'Головна', icon: Home, end: true },
  { to: '/app/catalog', label: 'Каталог', icon: ShoppingBag },
  { to: '/app/orders', label: 'Мої замовлення', icon: Package },
  { to: '/app/returns', label: 'Повернення', icon: RotateCcw },
]

export function CustomerLayout() {
  const { user, logout } = useAuth()
  const { itemCount } = useCart()
  const navigate = useNavigate()

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', display: 'flex', flexDirection: 'column' }}>
      <AppBar
        position="sticky"
        color="transparent"
        elevation={0}
        sx={{ borderBottom: '1px solid', borderColor: 'divider', bgcolor: 'background.paper' }}
      >
        <Toolbar sx={{ gap: 2, flexWrap: 'wrap', minHeight: 64 }}>
          <Stack
            direction="row"
            spacing={1}
            component={RouterLink}
            to="/app"
            sx={{ alignItems: 'center', textDecoration: 'none', color: 'inherit', mr: 1 }}
          >
            <Box
              sx={{
                width: 32,
                height: 32,
                borderRadius: '50%',
                bgcolor: 'primary.main',
                color: 'primary.contrastText',
                display: 'grid',
                placeItems: 'center',
                fontWeight: 800,
                fontSize: 14,
              }}
            >
              T
            </Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
              TechStore
            </Typography>
          </Stack>

          <Stack direction="row" spacing={0.5} sx={{ flex: 1, flexWrap: 'wrap', gap: 0.5 }}>
            {nav.map((item) => {
              const Icon = item.icon
              return (
                <Button
                  key={item.to}
                  component={NavLink}
                  to={item.to}
                  end={item.end}
                  size="small"
                  startIcon={<Icon size={16} />}
                  sx={{
                    color: 'text.secondary',
                    '&.active': { color: 'primary.main', bgcolor: 'rgba(255,107,74,0.12)' },
                  }}
                >
                  {item.label}
                </Button>
              )
            })}
          </Stack>

          <Button
            size="small"
            variant="outlined"
            onClick={() => navigate('/app/cart')}
            sx={{ minWidth: 0 }}
          >
            <Badge badgeContent={itemCount} color="primary">
              Кошик
            </Badge>
          </Button>

          <Typography variant="body2" color="text.secondary" sx={{ display: { xs: 'none', sm: 'block' } }}>
            {user?.firstName} {user?.lastName}
          </Typography>
          <Button size="small" startIcon={<LogOut size={16} />} onClick={() => void logout()}>
            Вихід
          </Button>
        </Toolbar>
      </AppBar>

      <Container maxWidth="lg" sx={{ py: { xs: 2, md: 3 }, flex: 1 }}>
        <Outlet />
      </Container>
    </Box>
  )
}
