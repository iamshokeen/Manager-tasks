import useSWR from 'swr'

const fetcher = (url: string) => fetch(url).then(r => r.json()).then(r => r.data)

export function useNumbers() {
  const { data, error, mutate, isLoading } = useSWR('/api/numbers', fetcher)
  return { numbers: data ?? { weekly: [], monthly: [] }, error, mutate, isLoading }
}
