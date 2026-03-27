// src/context/WorkspaceContext.tsx
'use client'
import { createContext, useContext, useEffect, useState, useCallback } from 'react'

export interface WorkspaceInfo {
  id: string
  name: string
  slug: string
  type: string
  description?: string | null
  isArchived: boolean
  userRole: string
}

interface WorkspaceContextValue {
  workspaces: WorkspaceInfo[]
  currentWorkspace: WorkspaceInfo | null
  setCurrentWorkspace: (ws: WorkspaceInfo) => void
  isLoading: boolean
}

const WorkspaceContext = createContext<WorkspaceContextValue>({
  workspaces: [],
  currentWorkspace: null,
  setCurrentWorkspace: () => {},
  isLoading: true,
})

const STORAGE_KEY = 'lcc_workspace'

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const [workspaces, setWorkspaces] = useState<WorkspaceInfo[]>([])
  const [currentWorkspace, setCurrentWorkspaceState] = useState<WorkspaceInfo | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetch('/api/workspaces/mine')
      .then((r) => r.json())
      .then(({ workspaces: list }: { workspaces: WorkspaceInfo[] }) => {
        if (!list?.length) return
        setWorkspaces(list)

        const saved = localStorage.getItem(STORAGE_KEY)
        const preferred = list.find((w) => w.id === saved) ?? list[0]
        setCurrentWorkspaceState(preferred)
      })
      .catch(() => {})
      .finally(() => setIsLoading(false))
  }, [])

  const setCurrentWorkspace = useCallback((ws: WorkspaceInfo) => {
    setCurrentWorkspaceState(ws)
    localStorage.setItem(STORAGE_KEY, ws.id)
  }, [])

  return (
    <WorkspaceContext.Provider value={{ workspaces, currentWorkspace, setCurrentWorkspace, isLoading }}>
      {children}
    </WorkspaceContext.Provider>
  )
}

export function useWorkspace() {
  return useContext(WorkspaceContext)
}
