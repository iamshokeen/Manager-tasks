import useSWR from 'swr'

const fetcher = (url: string) => fetch(url).then(r => r.json()).then(r => r.data)

export function useCadences() {
  const { data, error, mutate, isLoading } = useSWR('/api/cadence', fetcher)
  return { cadences: data ?? [], error, mutate, isLoading }
}
