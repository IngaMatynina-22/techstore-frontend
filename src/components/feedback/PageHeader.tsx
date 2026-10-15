import { Box, Breadcrumbs, Link, Stack, Typography } from '@mui/material'
import { Link as RouterLink } from 'react-router-dom'
import type { ReactNode } from 'react'

export function PageHeader({
  title,
  description,
  crumbs,
  actions,
}: {
  title: string
  description?: ReactNode
  crumbs?: { label: string; to?: string }[]
  actions?: ReactNode
}) {
  return (
    <Box sx={{ mb: 3 }}>
      {crumbs && crumbs.length > 0 && (
        <Breadcrumbs sx={{ mb: 1, fontSize: 13 }}>
          {crumbs.map((c) =>
            c.to ? (
              <Link key={c.label} component={RouterLink} to={c.to} underline="hover" color="inherit">
                {c.label}
              </Link>
            ) : (
              <Typography key={c.label} color="text.secondary" sx={{ fontSize: 13 }}>
                {c.label}
              </Typography>
            ),
          )}
        </Breadcrumbs>
      )}
      <Stack spacing={2} sx={{ flexDirection: { xs: 'column', sm: 'row' }, justifyContent: 'space-between', alignItems: { sm: 'center' } }}>
        <Box>
          <Typography variant="h5">{title}</Typography>
          {description && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              {description}
            </Typography>
          )}
        </Box>
        {actions && <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>{actions}</Stack>}
      </Stack>
    </Box>
  )
}
