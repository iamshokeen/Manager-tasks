import useSWR from 'swr'

const fetcher = (url: string) => fetch(url).then(r => r.json()).then(r => r.data)

export function useStakeholders() {
  const { data, error, mutate, isLoading } = useSWR('/api/stakeholders', fetcher)
  return { stakeholders: data ?? [], error, mutate, isLoading }
}

export function useStakeholder(id: string) {
  const { data, error, mutate, isLoading } = useSWR(id ? `/api/stakeholders/${id}` : null, fetcher)
  return { stakeholder: data, error, mutate, isLoading }
}
