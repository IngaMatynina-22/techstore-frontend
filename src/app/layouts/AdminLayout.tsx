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
  BarChart3,
  FileUp,
  Settings,
  Menu,
  ChevronLeft,
  LogOut,
  Sun,
  Moon,
} from 'lucide-react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '@/features/auth/AuthContext'
import { useThemeMode } from '@/app/ThemeModeContext'
import { GlobalSearch } from '@/features/search/GlobalSearch'
import { NotificationCenter } from '@/features/notifications/NotificationCenter'

const drawerWidth = 268
const collapsedWidth = 76

type NavItem = { label: string; to: string; icon: typeof LayoutDashboard; adminOnly?: boolean }
type NavGroup = { title: string; items: NavItem[] }

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
        {(open || mobile) && (
          <Typography variant="h6" sx={{ fontWeight: 800, letterSpacing: '-0.03em', flex: 1 }}>
            TechStore
          </Typography>
        )}
        {!mobile && (
          <IconButton size="small" onClick={() => setOpen((v) => !v)}>
            {open ? <ChevronLeft size={18} /> : <Menu size={18} />}
          </IconButton>
        )}
      </Toolbar>

      {(open || mobile) && (
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
      )}
      {!open && !mobile && (
        <Box sx={{ display: 'flex', justifyContent: 'center', pb: 1 }}>
          <IconButton size="small" onClick={toggle}>
            {mode === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
          </IconButton>
        </Box>
      )}

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
                open || mobile ? (
                  <ListSubheader sx={{ bgcolor: 'transparent', lineHeight: '28px', fontSize: 11 }}>
                    {group.title}
                  </ListSubheader>
                ) : undefined
              }
            >
              {items.map((item) => {
                const Icon = item.icon
                return (
                  <ListItemButton
                    key={item.to}
                    component={NavLink}
                    to={item.to}
                    end={item.to === '/'}
                    onClick={() => mobile && setMobileOpen(false)}
                    sx={{
                      mx: 1,
                      borderRadius: 2,
                      mb: 0.25,
                      '&.active': {
                        bgcolor: 'rgba(255,107,74,0.14)',
                        color: 'primary.main',
                        '& .MuiListItemIcon-root': { color: 'primary.main' },
                      },
                    }}
                  >
                    <ListItemIcon sx={{ minWidth: 36, color: 'inherit' }}>
                      <Icon size={18} />
                    </ListItemIcon>
                    {(open || mobile) && <ListItemText primary={item.label} />}
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
          {(open || mobile) && <ListItemText primary="Вихід" />}
        </ListItemButton>
      </Box>
    </Box>
  )

  const width = open ? drawerWidth : collapsedWidth

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
        <Drawer
          variant="permanent"
          sx={{
            width,
            flexShrink: 0,
            '& .MuiDrawer-paper': {
              width,
              boxSizing: 'border-box',
              bgcolor: 'background.paper',
              borderRight: '1px solid',
              borderColor: 'divider',
              transition: 'width 0.2s',
              overflowX: 'hidden',
            },
          }}
        >
          {drawerContent}
        </Drawer>
      )}

      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <AppBar
          position="sticky"
          color="transparent"
          elevation={0}
          sx={{
            borderBottom: '1px solid',
            borderColor: 'divider',
            bgcolor: theme.palette.mode === 'dark' ? 'rgba(18,18,18,0.85)' : 'rgba(245,245,245,0.9)',
            backdropFilter: 'blur(10px)',
          }}
        >
          <Toolbar sx={{ gap: 2, py: 0.5 }}>
            {mobile && (
              <IconButton edge="start" onClick={() => setMobileOpen(true)}>
                <Menu size={20} />
              </IconButton>
            )}
            <Box sx={{ minWidth: 120, display: { xs: 'none', md: 'block' } }}>
              <Typography variant="caption" color="text.secondary">
                TechStore
              </Typography>
              <Typography variant="subtitle1" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
                {title}
              </Typography>
            </Box>
            <GlobalSearch />
            <NotificationCenter />
            <Stack direction="row" spacing={1} sx={{ display: { xs: 'none', sm: 'flex' }, alignItems: 'center' }}>
              <Avatar sx={{ width: 36, height: 36, bgcolor: 'primary.main', fontSize: 14 }}>
                {(user?.firstName?.[0] || user?.email?.[0] || 'U').toUpperCase()}
              </Avatar>
              <Box>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  {user?.firstName} {user?.lastName}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {user?.roles?.join(', ')}
                </Typography>
              </Box>
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
