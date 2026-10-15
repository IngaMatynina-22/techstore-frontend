import { api } from './client'
import type { LoginRequest, UserDto } from '@/types/api'

export const authApi = {
  login: (body: LoginRequest) => api.post<UserDto>('/api/account/login', body).then((r) => r.data),
  logout: () => api.post('/api/account/logout'),
  me: () => api.get<UserDto>('/api/account/me').then((r) => r.data),
}
