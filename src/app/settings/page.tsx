'use client'
import { useState } from 'react'
import useSWR from 'swr'
import { PageHeader } from '@/components/ui/page-header'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { formatDate } from '@/lib/utils'
import { RefreshCw, Download, Send } from 'lucide-react'
import { ThemeSelector } from '@/components/ui/theme-selector'

function TargetsUpload() {
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState<string | null>(null)

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setLoading(true)
    setStatus(null)
    try {
      const form = new FormData()
      form.append('file', file)
      const res = await fetch('/api/targets/upload', { method: 'POST', body: form })
      const json = await res.json()
      if (json.ok) setStatus('Targets uploaded successfully')
      else setStatus(`Error: ${json.error}`)
    } catch {
      setStatus('Upload failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">Upload Targets CSV to update OTA and Check-in GMV targets.</p>
      <label className="flex items-center gap-3 cursor-pointer">
        <span className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90">
          {loading ? 'Uploading...' : 'Upload Targets CSV'}
        </span>
        <input type="file" accept=".csv" onChange={handleUpload} className="hidden" disabled={loading} />
      </label>
      {status && <p className="text-sm text-muted-foreground">{status}</p>}
    </div>
  )
}

interface NumberEntry {
  syncedAt?: string | null
}

interface NumbersData {
  weekly?: NumberEntry[]
  monthly?: NumberEntry[]
}

const fetcher = (url: string) => fetch(url).then(r => r.json()).then(r => r.data)

export default function SettingsPage() {
  const { data: numbersData, mutate: mutateNumbers } = useSWR<NumbersData>('/api/numbers', fetcher)

  const [syncing, setSyncing] = useState(false)
  const [prepLoading, setPrepLoading] = useState(false)
  const [reportLoading, setReportLoading] = useState(false)
  const [exporting, setExporting] = useState(false)

  // Find most recent syncedAt across all entries
  const allEntries: NumberEntry[] = [
    ...(numbersData?.weekly ?? []),
    ...(numbersData?.monthly ?? []),
  ]
  const lastSynced = allEntries
    .map(e => e.syncedAt)
    .filter(Boolean)
    .sort((a, b) => new Date(b!).getTime() - new Date(a!).getTime())[0] ?? null

  async function handleSheetsSync() {
    setSyncing(true)
    try {
      const res = await fetch('/api/numbers/sync', { method: 'POST' })
      const json = await res.json()
      const count = json.data?.synced ?? json.synced ?? 0
      toast.success(`Synced ${count} records from Sheets`)
      mutateNumbers()
    } catch {
      toast.error('Sync failed')
    } finally {
      setSyncing(false)
    }
  }

  async function handlePrepTasks() {
    setPrepLoading(true)
    try {
      const res = await fetch('/api/cadence')
      const json = await res.json()
      const cadences: { id: string }[] = json.data ?? []
      let total = 0
      for (const cadence of cadences) {
        const r = await fetch('/api/cadence/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ cadenceId: cadence.id }),
        })
        const j = await r.json()
        total += j.data?.created ?? j.created ?? 0
      }
      toast.success(`${total} prep tasks generated`)
    } catch {
      toast.error('Failed to generate prep tasks')
    } finally {
      setPrepLoading(false)
    }
  }

  async function handleWeeklyReport() {
    setReportLoading(true)
    try {
      const res = await fetch('/api/reports', { method: 'POST' })
      const json = await res.json()
      const id = json.data?.id
      if (!id) throw new Error('No report id')
      await fetch(`/api/reports/${id}/email`, { method: 'POST' })
      toast.success('Weekly report generated and emailed')
    } catch {
      toast.error('Failed to generate/email report')
    } finally {
      setReportLoading(false)
    }
  }

  async function handleExport() {
    setExporting(true)
    try {
      const [tasks, team, projects, stakeholders, oneOnOnes, cadences, reports, numbers] =
        await Promise.all([
          fetch('/api/tasks').then(r => r.json()),
          fetch('/api/team').then(r => r.json()),
          fetch('/api/projects').then(r => r.json()),
          fetch('/api/stakeholders').then(r => r.json()),
          fetch('/api/one-on-ones').then(r => r.json()),
          fetch('/api/cadence').then(r => r.json()),
          fetch('/api/reports').then(r => r.json()),
          fetch('/api/numbers').then(r => r.json()),
        ])
      const exportData = {
        tasks,
        team,
        projects,
        stakeholders,
        oneOnOnes,
        cadences,
        reports,
        numbers,
        exportedAt: new Date().toISOString(),
      }
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `lohono-export-${new Date().toISOString().split('T')[0]}.json`
      a.click()
      URL.revokeObjectURL(url)
      toast.success('Export downloaded')
    } catch {
      toast.error('Export failed')
    } finally {
      setExporting(false)
    }
  }

  return (
    <div>
      <PageHeader title="Settings" description="Configuration, sync, and automation controls" />

      {/* Theme */}
      <div className="bg-card rounded-xl shadow-[var(--shadow-glass)] p-5 mb-4">
        <h2 className="text-sm font-semibold text-foreground mb-1 uppercase tracking-wider">
          Appearance
        </h2>
        <p className="text-xs text-muted-foreground mb-5">Choose a theme for the interface</p>
        <ThemeSelector />
      </div>

      {/* Revenue Targets Upload */}
      <div className="bg-card rounded-xl shadow-[var(--shadow-glass)] p-5 mb-4">
        <h2 className="text-sm font-semibold text-foreground mb-3 uppercase tracking-wider">
          Revenue Targets (FY27)
        </h2>
        <TargetsUpload />
      </div>

      {/* Sheets Sync */}
      <div className="bg-card rounded-xl shadow-[var(--shadow-glass)] p-5 mb-4">
        <h2 className="text-sm font-semibold text-foreground mb-3 uppercase tracking-wider">
          Google Sheets Sync
        </h2>
        <p className="text-xs text-muted-foreground mb-3">
          Last synced: {lastSynced ? formatDate(lastSynced) : 'Never'}
        </p>
        <Button onClick={handleSheetsSync} disabled={syncing}>
          <RefreshCw className={`h-4 w-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
          {syncing ? 'Syncing...' : 'Sync Now'}
        </Button>
        <p className="text-xs text-muted-foreground mt-2">
          Configure SHEETS_SCRIPT_URL and SHEETS_SCRIPT_TOKEN in your environment.
        </p>
      </div>

      {/* Automation */}
      <div className="bg-card rounded-xl shadow-[var(--shadow-glass)] p-5 mb-4">
        <h2 className="text-sm font-semibold text-foreground mb-3 uppercase tracking-wider">
          Run Automations
        </h2>
        <div className="flex flex-wrap gap-3">
          <Button variant="outline" onClick={handlePrepTasks} disabled={prepLoading}>
            {prepLoading ? 'Generating...' : 'Generate Prep Tasks'}
          </Button>
          <Button variant="outline" onClick={handleWeeklyReport} disabled={reportLoading}>
            <Send className="h-4 w-4 mr-2" />
            {reportLoading ? 'Processing...' : 'Generate + Email Weekly Report'}
          </Button>
        </div>
      </div>

      {/* Data Export */}
      <div className="bg-card border border-border rounded-lg p-5">
        <h2 className="text-sm font-semibold text-foreground mb-3 uppercase tracking-wider">
          Data Export
        </h2>
        <p className="text-xs text-muted-foreground mb-3">
          Download a full JSON backup of all your data.
        </p>
        <Button variant="outline" onClick={handleExport} disabled={exporting}>
          <Download className="h-4 w-4 mr-2" />
          {exporting ? 'Exporting...' : 'Export All Data (JSON)'}
        </Button>
      </div>
    </div>
  )
}
