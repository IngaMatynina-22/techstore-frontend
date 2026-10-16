import { useMemo, useState } from 'react'
import {
  AppBar,
  Avatar,
  Box,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  ListSubheader,
  Stack,
  Toolbar,
  Typography,
  Tooltip,
  useMediaQuery,
  useTheme,
} from '@mui/material'
import {
  LayoutDashboard,
  Package,
  Warehouse,
  ShoppingCart,
  Truck,
  RotateCcw,
  Users,
  BarChart3,
  FileUp,
  Settings,
  Menu,
  ChevronLeft,
  LogOut,
  Sun,
  Moon,
} from 'lucide-react'
import { Link as RouterLink, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '@/features/auth/AuthContext'
import { useThemeMode } from '@/app/ThemeModeContext'
import { GlobalSearch } from '@/features/search/GlobalSearch'
import { NotificationCenter } from '@/features/notifications/NotificationCenter'

const drawerWidth = 268

type NavItem = { label: string; to: string; icon: typeof LayoutDashboard; adminOnly?: boolean }
type NavGroup = { title: string; items: NavItem[] }

function isNavItemActive(to: string, pathname: string): boolean {
  if (to === '/') return pathname === '/'
  if (to === '/inventory') {
    return (
      pathname === '/inventory' ||
      pathname === '/inventory/low-stock' ||
      pathname === '/inventory/out-of-stock'
    )
  }
  return pathname === to || pathname.startsWith(`${to}/`)
}

const navGroups: NavGroup[] = [
  { title: 'Огляд', items: [{ label: 'Головна', to: '/', icon: LayoutDashboard }] },
  {
    title: 'Каталог',
    items: [
      { label: 'Товари', to: '/catalog/products', icon: Package },
      { label: 'Категорії', to: '/catalog/categories', icon: Package },
      { label: 'Бренди', to: '/catalog/brands', icon: Package },
      { label: 'Характеристики', to: '/catalog/attributes', icon: Package },
    ],
  },
  {
    title: 'Склад',
    items: [
      { label: 'Залишки', to: '/inventory', icon: Warehouse },
      { label: 'Рухи', to: '/inventory/movements', icon: Warehouse },
      { label: 'Інвентаризація', to: '/inventory/counts', icon: Warehouse },
      { label: 'Склади', to: '/inventory/warehouses', icon: Warehouse },
    ],
  },
  {
    title: 'Операції',
    items: [
      { label: 'Замовлення', to: '/orders', icon: ShoppingCart },
      { label: 'Клієнти', to: '/customers', icon: Users },
      { label: 'Постачальники', to: '/purchasing/suppliers', icon: Truck },
      { label: 'Закупівлі', to: '/purchasing/purchase-orders', icon: Truck },
      { label: 'Повернення', to: '/returns', icon: RotateCcw },
    ],
  },
  {
    title: 'Дані',
    items: [
      { label: 'Аналітика', to: '/reports', icon: BarChart3 },
      { label: 'Імпорт', to: '/data/import', icon: FileUp },
      { label: 'Експорт', to: '/data/export', icon: FileUp },
    ],
  },
  {
    title: 'Адмін',
    items: [
      { label: 'Налаштування', to: '/admin/settings', icon: Settings },
      { label: 'Користувачі', to: '/admin/users', icon: Users, adminOnly: true },
      { label: 'Аудит', to: '/admin/audit-logs', icon: Settings, adminOnly: true },
      { label: 'Система', to: '/admin/system', icon: Settings },
    ],
  },
]

export function AdminLayout() {
  const theme = useTheme()
  const mobile = useMediaQuery(theme.breakpoints.down('md'))
  const [open, setOpen] = useState(!mobile)
  const [mobileOpen, setMobileOpen] = useState(false)
  const { user, logout, isAdmin, isStaff } = useAuth()
  const { mode, toggle } = useThemeMode()
  const location = useLocation()

  const title = useMemo(() => {
    const flat = navGroups.flatMap((g) => g.items)
    const match = flat
      .filter((i) => i.to !== '/')
      .sort((a, b) => b.to.length - a.to.length)
      .find((i) => location.pathname.startsWith(i.to))
    if (location.pathname === '/') return 'Головна панель'
    return match?.label ?? 'TechStore'
  }, [location.pathname])

  const drawerContent = (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Toolbar sx={{ px: 2, gap: 1.5 }}>
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
            flexShrink: 0,
          }}
        >
          T
        </Box>
        <Typography variant="h6" sx={{ fontWeight: 800, letterSpacing: '-0.03em', flex: 1 }}>
          TechStore
        </Typography>
        {!mobile && (
          <IconButton size="small" onClick={() => setOpen(false)} aria-label="Згорнути меню">
            <ChevronLeft size={18} />
          </IconButton>
        )}
      </Toolbar>

      <Box sx={{ px: 2, pb: 1 }}>
        <Tooltip title={mode === 'dark' ? 'Світла тема' : 'Темна тема'}>
          <IconButton
            onClick={toggle}
            size="small"
            sx={{
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: 2,
              width: '100%',
              justifyContent: 'flex-start',
              px: 1.5,
              gap: 1,
            }}
          >
            {mode === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
            <Typography variant="body2">{mode === 'dark' ? 'Світла тема' : 'Темна тема'}</Typography>
          </IconButton>
        </Tooltip>
      </Box>

      <Divider />
      <Box sx={{ overflow: 'auto', flex: 1, py: 1 }}>
        {navGroups.map((group) => {
          const items = group.items.filter((i) => !i.adminOnly || isAdmin)
          if (!items.length || (!isStaff && group.title !== 'Огляд')) return null
          return (
            <List
              key={group.title}
              dense
              subheader={
                <ListSubheader sx={{ bgcolor: 'transparent', lineHeight: '28px', fontSize: 11 }}>
                  {group.title}
                </ListSubheader>
              }
            >
              {items.map((item) => {
                const Icon = item.icon
                return (
                  <ListItemButton
                    key={item.to}
                    component={RouterLink}
                    to={item.to}
                    selected={isNavItemActive(item.to, location.pathname)}
                    onClick={() => mobile && setMobileOpen(false)}
                    sx={{
                      mx: 1,
                      borderRadius: 2,
                      mb: 0.25,
                      '&.Mui-selected': {
                        bgcolor: 'rgba(255,107,74,0.14)',
                        color: 'primary.main',
                        '& .MuiListItemIcon-root': { color: 'primary.main' },
                      },
                      '&.Mui-selected:hover': {
                        bgcolor: 'rgba(255,107,74,0.2)',
                      },
                    }}
                  >
                    <ListItemIcon sx={{ minWidth: 36, color: 'inherit' }}>
                      <Icon size={18} />
                    </ListItemIcon>
                    <ListItemText primary={item.label} />
                  </ListItemButton>
                )
              })}
            </List>
          )
        })}
      </Box>

      <Divider />
      <Box sx={{ p: 1.5 }}>
        <ListItemButton onClick={() => void logout()} sx={{ borderRadius: 2 }}>
          <ListItemIcon sx={{ minWidth: 36 }}>
            <LogOut size={18} />
          </ListItemIcon>
          <ListItemText primary="Вихід" />
        </ListItemButton>
      </Box>
    </Box>
  )

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default' }}>
      {mobile ? (
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={() => setMobileOpen(false)}
          ModalProps={{ keepMounted: true }}
          sx={{ '& .MuiDrawer-paper': { width: drawerWidth } }}
        >
          {drawerContent}
        </Drawer>
      ) : (
        open && (
          <Drawer
            variant="permanent"
            sx={{
              width: drawerWidth,
              flexShrink: 0,
              '& .MuiDrawer-paper': {
                width: drawerWidth,
                boxSizing: 'border-box',
                bgcolor: 'background.paper',
                borderRight: '1px solid',
                borderColor: 'divider',
              },
            }}
          >
            {drawerContent}
          </Drawer>
        )
      )}

      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <AppBar
          position="sticky"
          color="transparent"
          elevation={0}
          sx={{
            borderBottom: '1px solid',
            borderColor: 'divider',
            bgcolor: 'background.paper',
          }}
        >
          <Toolbar
            sx={{
              gap: 2,
              minHeight: { xs: 64, md: 72 },
              px: { xs: 2, md: 3 },
              alignItems: 'center',
            }}
          >
            {(mobile || !open) && (
              <IconButton
                edge="start"
                onClick={() => (mobile ? setMobileOpen(true) : setOpen(true))}
                aria-label="Відкрити меню"
              >
                <Menu size={20} />
              </IconButton>
            )}
            <Box sx={{ minWidth: 140, flexShrink: 0, display: { xs: 'none', md: 'block' } }}>
              <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.2, display: 'block' }}>
                TechStore
              </Typography>
              <Typography variant="subtitle1" sx={{ fontWeight: 700, lineHeight: 1.25, mt: 0.25 }}>
                {title}
              </Typography>
            </Box>
            <Box sx={{ flex: 1, display: 'flex', justifyContent: 'center', minWidth: 0 }}>
              <GlobalSearch />
            </Box>
            <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', flexShrink: 0 }}>
              <NotificationCenter />
              <Stack
                direction="row"
                spacing={1.25}
                sx={{ display: { xs: 'none', sm: 'flex' }, alignItems: 'center' }}
              >
                <Avatar sx={{ width: 40, height: 40, bgcolor: 'primary.main', fontSize: 15, fontWeight: 700 }}>
                  {(user?.firstName?.[0] || user?.email?.[0] || 'U').toUpperCase()}
                </Avatar>
                <Box sx={{ lineHeight: 1.2 }}>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {user?.firstName} {user?.lastName}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {user?.roles?.join(', ')}
                  </Typography>
                </Box>
              </Stack>
            </Stack>
          </Toolbar>
        </AppBar>
        <Box component="main" sx={{ flex: 1, p: { xs: 2, md: 3 } }}>
          <Outlet />
        </Box>
      </Box>
    </Box>
  )
}
