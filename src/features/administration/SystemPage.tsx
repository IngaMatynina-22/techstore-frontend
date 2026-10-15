import { useEffect, useState } from 'react'
import { Box, Button, Chip, Paper, Stack, Typography } from '@mui/material'
import { useQuery } from '@tanstack/react-query'
import { PageHeader } from '@/components/feedback/PageHeader'
import { QueryError } from '@/components/feedback/EmptyState'
import { getErrorMessage } from '@/api/client'
import { healthApi } from '@/api/admin.api'

function HealthBlock({
  title,
  data,
  loading,
  error,
  onRetry,
}: {
  title: string
  data: unknown
  loading: boolean
  error: unknown
  onRetry: () => void
}) {
  const ok = !error && data != null
  return (
    <Paper sx={{ p: 2, flex: 1, minWidth: 240 }}>
      <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
        <Typography variant="subtitle1">{title}</Typography>
        <Chip size="small" label={loading ? '…' : ok ? 'OK' : 'Помилка'} color={loading ? 'default' : ok ? 'success' : 'error'} />
      </Stack>
      {error ? (
        <QueryError message={getErrorMessage(error)} onRetry={onRetry} />
      ) : (
        <Box
          component="pre"
          sx={{
            m: 0,
            p: 1.5,
            bgcolor: 'action.hover',
            borderRadius: 1,
            fontSize: 12,
            overflow: 'auto',
            maxHeight: 200,
          }}
        >
          {loading ? 'Завантаження…' : JSON.stringify(data, null, 2)}
        </Box>
      )}
    </Paper>
  )
}

export function SystemPage() {
  const [auto, setAuto] = useState(true)

  const liveQ = useQuery({
    queryKey: ['health', 'live'],
    queryFn: () => healthApi.live(),
    refetchInterval: auto ? 10_000 : false,
  })
  const readyQ = useQuery({
    queryKey: ['health', 'ready'],
    queryFn: () => healthApi.ready(),
    refetchInterval: auto ? 10_000 : false,
  })

  useEffect(() => {
    void liveQ.refetch()
    void readyQ.refetch()
  }, [])

  return (
    <>
      <PageHeader
        title="Система"
        description="Стан сервісу (live / ready)"
        actions={
          <Stack direction="row" spacing={1}>
            <Button size="small" variant={auto ? 'contained' : 'outlined'} onClick={() => setAuto((v) => !v)}>
              {auto ? 'Авто 10 с' : 'Авто вимк.'}
            </Button>
            <Button
              size="small"
              variant="outlined"
              onClick={() => {
                void liveQ.refetch()
                void readyQ.refetch()
              }}
            >
              Оновити
            </Button>
          </Stack>
        }
      />
      <Stack sx={{ flexDirection: { xs: 'column', md: 'row' } }} spacing={2}>
        <HealthBlock
          title="/health/live"
          data={liveQ.data}
          loading={liveQ.isLoading}
          error={liveQ.error}
          onRetry={() => void liveQ.refetch()}
        />
        <HealthBlock
          title="/health/ready"
          data={readyQ.data}
          loading={readyQ.isLoading}
          error={readyQ.error}
          onRetry={() => void readyQ.refetch()}
        />
      </Stack>
    </>
  )
}
