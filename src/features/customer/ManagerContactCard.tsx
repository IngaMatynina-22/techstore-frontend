import { Link, Paper, Stack, Typography } from '@mui/material'

const manager = {
  name: import.meta.env.VITE_MANAGER_NAME?.trim(),
  phone: import.meta.env.VITE_MANAGER_PHONE?.trim(),
  email: import.meta.env.VITE_MANAGER_EMAIL?.trim(),
}

export function ManagerContactCard() {
  const isConfigured = Boolean(manager.name || manager.phone || manager.email)

  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Stack spacing={1}>
        <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
          Контакти менеджера
        </Typography>
        {manager.name && <Typography variant="body2">{manager.name}</Typography>}
        {manager.phone && (
          <Typography variant="body2">
            Телефон:{' '}
            <Link href={`tel:${manager.phone}`}>
              {manager.phone}
            </Link>
          </Typography>
        )}
        {manager.email && (
          <Typography variant="body2">
            Email:{' '}
            <Link href={`mailto:${manager.email}`}>
              {manager.email}
            </Link>
          </Typography>
        )}
        {!isConfigured && (
          <Typography variant="body2" color="text.secondary">
            Контактні дані менеджера ще не налаштовані.
          </Typography>
        )}
      </Stack>
    </Paper>
  )
}
