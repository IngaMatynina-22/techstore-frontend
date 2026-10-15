import { useState } from 'react'
import {
  Button,
  FormControl,
  InputLabel,
  Link,
  MenuItem,
  Paper,
  Select,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import { Link as RouterLink, useNavigate } from 'react-router-dom'
import { useMutation, useQuery } from '@tanstack/react-query'
import { enqueueSnackbar } from 'notistack'
import { PageHeader } from '@/components/feedback/PageHeader'
import { getErrorMessage } from '@/api/client'
import { countsApi, warehousesApi } from '@/api/inventory.api'

export function CountsPage() {
  const navigate = useNavigate()
  const [warehouseId, setWarehouseId] = useState('')
  const [notes, setNotes] = useState('')
  const [openId, setOpenId] = useState('')

  const { data: warehouses = [] } = useQuery({
    queryKey: ['warehouses'],
    queryFn: () => warehousesApi.list(),
  })

  const create = useMutation({
    mutationFn: () => {
      const wid = Number(warehouseId)
      if (!Number.isFinite(wid)) throw new Error('Оберіть склад')
      return countsApi.create({ warehouseId: wid, notes: notes.trim() || undefined })
    },
    onSuccess: (session) => {
      enqueueSnackbar('Інвентаризацію створено', { variant: 'success' })
      navigate(`/inventory/counts/${session.id}`)
    },
    onError: (e) => enqueueSnackbar(getErrorMessage(e), { variant: 'error' }),
  })

  const openSession = () => {
    const id = Number(openId.trim())
    if (!Number.isFinite(id) || id <= 0) {
      enqueueSnackbar('Введіть коректний номер сесії', { variant: 'warning' })
      return
    }
    navigate(`/inventory/counts/${id}`)
  }

  return (
    <>
      <PageHeader
        title="Інвентаризація"
        description="Створення та перегляд сесій інвентаризації"
      />
      <Stack sx={{ flexDirection: { xs: 'column', md: 'row' } }} spacing={3}>
        <Paper sx={{ p: 3, flex: 1, maxWidth: 480 }}>
          <Typography variant="subtitle1" sx={{  mb: 2 , fontWeight: 600 }}>
            Нова інвентаризація
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Оберіть склад для знімка залишків. Після створення ви перейдете до сторінки сесії.
          </Typography>
          <Stack spacing={2}>
            <FormControl fullWidth size="small">
              <InputLabel>Склад</InputLabel>
              <Select label="Склад" value={warehouseId} onChange={(e) => setWarehouseId(e.target.value)}>
                {warehouses.map((w) => (
                  <MenuItem key={w.id} value={String(w.id)}>
                    {w.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              size="small"
              label="Примітки"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              fullWidth
              multiline
              minRows={2}
            />
            <Button variant="contained" onClick={() => create.mutate()} disabled={create.isPending}>
              Створити
            </Button>
          </Stack>
        </Paper>
        <Paper sx={{ p: 3, flex: 1, maxWidth: 480 }}>
          <Typography variant="subtitle1" sx={{  mb: 2 , fontWeight: 600 }}>
            Відкрити існуючу
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Список сесій недоступний через API. Введіть ID сесії, щоб продовжити роботу.
          </Typography>
          <Stack direction="row" spacing={1}>
            <TextField
              size="small"
              label="ID сесії"
              type="number"
              value={openId}
              onChange={(e) => setOpenId(e.target.value)}
              fullWidth
            />
            <Button variant="outlined" onClick={openSession}>
              Відкрити
            </Button>
          </Stack>
          <Typography variant="caption" color="text.secondary" sx={{ mt: 2, display: 'block' }}>
            Або перейдіть зі{' '}
            <Link component={RouterLink} to="/inventory">
              залишків
            </Link>{' '}
            після створення нової сесії.
          </Typography>
        </Paper>
      </Stack>
    </>
  )
}
