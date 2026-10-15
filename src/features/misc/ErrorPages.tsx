import { Box, Button, Typography } from '@mui/material'
import { Link as RouterLink } from 'react-router-dom'

export function ForbiddenPage() {
  return (
    <Box sx={{ minHeight: '60vh', display: 'grid', placeItems: 'center', textAlign: 'center', p: 3 }}>
      <Box>
        <Typography variant="h3" sx={{ fontWeight: 700 }}>
          403
        </Typography>
        <Typography color="text.secondary" sx={{ my: 2 }}>
          Недостатньо прав для перегляду цієї сторінки.
        </Typography>
        <Button component={RouterLink} to="/" variant="contained">
          На головну
        </Button>
      </Box>
    </Box>
  )
}

export function NotFoundPage() {
  return (
    <Box sx={{ minHeight: '60vh', display: 'grid', placeItems: 'center', textAlign: 'center', p: 3 }}>
      <Box>
        <Typography variant="h3" sx={{ fontWeight: 700 }}>
          404
        </Typography>
        <Typography color="text.secondary" sx={{ my: 2 }}>
          Сторінку не знайдено.
        </Typography>
        <Button component={RouterLink} to="/" variant="contained">
          На головну
        </Button>
      </Box>
    </Box>
  )
}
