import { Box, Button, Stack, Typography } from '@mui/material'
import { Link as RouterLink } from 'react-router-dom'
import { useAuth } from '@/features/auth/AuthContext'

export function ForbiddenPage() {
  const { homePath } = useAuth()

  return (
    <Box sx={{ minHeight: '60vh', display: 'grid', placeItems: 'center', textAlign: 'center', p: 3 }}>
      <Box>
        <Typography variant="h3" sx={{ fontWeight: 700 }}>
          403
        </Typography>
        <Typography color="text.secondary" sx={{ my: 2, maxWidth: 420, mx: 'auto' }}>
          Недостатньо прав для перегляду цієї сторінки.
        </Typography>
        <Stack direction="row" spacing={1} sx={{ justifyContent: 'center' }}>
          <Button component={RouterLink} to={homePath} variant="contained">
            На головну
          </Button>
        </Stack>
      </Box>
    </Box>
  )
}

export function NotFoundPage() {
  const { homePath } = useAuth()

  return (
    <Box sx={{ minHeight: '60vh', display: 'grid', placeItems: 'center', textAlign: 'center', p: 3 }}>
      <Box>
        <Typography variant="h3" sx={{ fontWeight: 700 }}>
          404
        </Typography>
        <Typography color="text.secondary" sx={{ my: 2 }}>
          Сторінку не знайдено.
        </Typography>
        <Button component={RouterLink} to={homePath} variant="contained">
          На головну
        </Button>
      </Box>
    </Box>
  )
}
