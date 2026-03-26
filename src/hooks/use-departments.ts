import useSWR from 'swr'

const fetcher = (url: string) => fetch(url).then(r => r.json())
const FALLBACK = ['Analytics', 'Revenue', 'OTA', 'Marketing', 'Financial Modelling', 'Program Management']

export function useDepartments() {
  const { data, mutate, isLoading } = useSWR('/api/settings/departments', fetcher)
  const departments: string[] = data?.departments ?? FALLBACK
  return { departments, mutate, isLoading }
}
