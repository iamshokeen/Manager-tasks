// src/hooks/use-current-user.ts
import useSWR from 'swr'

interface CurrentUser {
  id: string
  name: string
  email: string
  role: string
  teamMemberId?: string
}

const fetcher = (url: string) => fetch(url).then(r => r.json()).then(r => r.data)

export function useCurrentUser() {
  const { data } = useSWR<CurrentUser>('/api/auth/me', fetcher, {
    revalidateOnFocus: false,
  })
  return data ?? null
}
