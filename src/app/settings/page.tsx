'use client'
import { useState } from 'react'
import useSWR from 'swr'
import { PageHeader } from '@/components/ui/page-header'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { formatDate } from '@/lib/utils'
import { RefreshCw, Download, Send } from 'lucide-react'

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

      {/* Revenue Targets */}
      <div className="bg-card border border-border rounded-lg p-5 mb-4">
        <h2 className="text-sm font-semibold text-foreground mb-3 uppercase tracking-wider">
          Revenue Targets (FY27)
        </h2>
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-background border border-border rounded p-3">
            <div className="text-xs text-muted-foreground mb-1">Check-in Revenue</div>
            <div className="text-xl font-bold font-mono text-[#C9A84C]">₹85 Cr</div>
          </div>
          <div className="bg-background border border-border rounded p-3">
            <div className="text-xs text-muted-foreground mb-1">OTA Gross Bookings</div>
            <div className="text-xl font-bold font-mono text-[#C9A84C]">₹5 Cr</div>
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-3">
          To update targets, edit environment configuration.
        </p>
      </div>

      {/* Sheets Sync */}
      <div className="bg-card border border-border rounded-lg p-5 mb-4">
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
      <div className="bg-card border border-border rounded-lg p-5 mb-4">
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
