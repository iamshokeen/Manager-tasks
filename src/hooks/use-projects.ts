import useSWR from 'swr'

const fetcher = (url: string) => fetch(url).then(r => r.json()).then(r => r.data)

export function useProjects(filters: { stage?: string; department?: string } = {}) {
  const params = new URLSearchParams()
  if (filters.stage) params.set('stage', filters.stage)
  if (filters.department) params.set('department', filters.department)
  const query = params.toString()
  const { data, error, mutate, isLoading } = useSWR(`/api/projects${query ? `?${query}` : ''}`, fetcher)
  return { projects: data ?? [], error, mutate, isLoading }
}

export function useProject(id: string) {
  const { data, error, mutate, isLoading } = useSWR(id ? `/api/projects/${id}` : null, fetcher)
  return { project: data, error, mutate, isLoading }
}
