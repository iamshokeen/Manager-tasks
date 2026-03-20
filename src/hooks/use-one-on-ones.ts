import useSWR from 'swr'

const fetcher = (url: string) => fetch(url).then(r => r.json()).then(r => r.data)

export function useOneOnOnes(memberId?: string) {
  const url = memberId ? `/api/one-on-ones?memberId=${memberId}` : '/api/one-on-ones'
  const { data, error, mutate, isLoading } = useSWR(url, fetcher)
  return { oneOnOnes: data ?? [], error, mutate, isLoading }
}

export function useOneOnOne(id: string) {
  const { data, error, mutate, isLoading } = useSWR(id ? `/api/one-on-ones/${id}` : null, fetcher)
  return { oneOnOne: data, error, mutate, isLoading }
}
