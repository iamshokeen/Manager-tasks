import useSWR from 'swr'

const fetcher = (url: string) => fetch(url).then(r => r.json()).then(r => r.data)

export function useTeam() {
  const { data, error, mutate, isLoading } = useSWR('/api/team', fetcher)
  return { members: data ?? [], error, mutate, isLoading }
}

export function useTeamMember(id: string) {
  const { data, error, mutate, isLoading } = useSWR(id ? `/api/team/${id}` : null, fetcher)
  return { member: data, error, mutate, isLoading }
}
