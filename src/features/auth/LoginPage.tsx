import { useState } from 'react'
import {
  Alert,
  Box,
  Button,
  IconButton,
  InputAdornment,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import { Eye, EyeOff } from 'lucide-react'
import { Navigate, useLocation } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useAuth } from './AuthContext'
import { getErrorMessage } from '@/api/client'
import { useThemeMode } from '@/app/ThemeModeContext'

const schema = z.object({
  email: z.string().email('Введіть коректний email'),
  password: z.string().min(1, "Обов'язкове поле"),
  rememberMe: z.boolean().optional(),
})

type FormValues = z.infer<typeof schema>

export function LoginPage() {
  const { user, loading, login, isStaff, isCustomer, homePath } = useAuth()
  const { mode } = useThemeMode()
  const location = useLocation()
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: '', password: '', rememberMe: true },
  })

  if (!loading && user) {
    const from = (location.state as { from?: string } | null)?.from
    if (isStaff) {
      const to = from && !from.startsWith('/app') ? from : '/'
      return <Navigate to={to} replace />
    }
    if (isCustomer) {
      const to = from?.startsWith('/app') ? from : '/app'
      return <Navigate to={to} replace />
    }
    return <Navigate to={homePath} replace />
  }

  const onSubmit = handleSubmit(async (values) => {
    setError(null)
    try {
      await login(values)
    } catch (e) {
      setError(getErrorMessage(e, 'Невірні облікові дані або помилка сервера'))
    }
  })

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        p: 2,
        background:
          mode === 'dark'
            ? 'radial-gradient(ellipse at 15% 20%, rgba(255,107,74,0.22), transparent 45%), #121212'
            : 'radial-gradient(ellipse at 15% 20%, rgba(255,107,74,0.18), transparent 45%), #F5F5F5',
      }}
    >
      <Paper sx={{ width: '100%', maxWidth: 420, p: 4, borderRadius: 4 }}>
        <Stack spacing={3}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box
              sx={{
                width: 40,
                height: 40,
                borderRadius: '50%',
                bgcolor: 'primary.main',
                color: '#fff',
                display: 'grid',
                placeItems: 'center',
                fontWeight: 800,
              }}
            >
              T
            </Box>
            <Box>
              <Typography variant="h4" sx={{ fontWeight: 800, letterSpacing: '-0.03em' }}>
                TechStore
              </Typography>
              <Typography color="text.secondary" variant="body2">
                Вхід для персоналу та клієнтів
              </Typography>
            </Box>
          </Box>
          {error && <Alert severity="error">{error}</Alert>}
          <Stack component="form" spacing={2} onSubmit={onSubmit}>
            <TextField
              label="Email"
              type="email"
              autoComplete="username"
              fullWidth
              error={!!errors.email}
              helperText={errors.email?.message}
              {...register('email')}
            />
            <TextField
              label="Пароль"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              fullWidth
              error={!!errors.password}
              helperText={errors.password?.message}
              slotProps={{
                input: {
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton onClick={() => setShowPassword((v) => !v)} edge="end">
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </IconButton>
                    </InputAdornment>
                  ),
                },
              }}
              {...register('password')}
            />
            <Button type="submit" variant="contained" size="large" disabled={isSubmitting || loading}>
              {isSubmitting ? 'Вхід…' : 'Увійти'}
            </Button>
          </Stack>
        </Stack>
      </Paper>
    </Box>
  )
}
