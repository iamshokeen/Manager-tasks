'use client'
import useSWR from 'swr'
import { useState } from 'react'
import { PageHeader } from '@/components/ui/page-header'
import { EmptyState } from '@/components/ui/empty-state'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { formatPeriod } from '@/lib/format'
import { formatDate } from '@/lib/utils'
import { FileText, Mail, RefreshCw } from 'lucide-react'

interface Report {
  id: string
  type: string
  period: string
  data: unknown
  createdAt: string
  emailedAt?: string | null
}

const fetcher = (url: string) => fetch(url).then(r => r.json()).then(r => r.data)

export default function ReportsPage() {
  const { data: reports, mutate } = useSWR<Report[]>('/api/reports', fetcher)
  const [generating, setGenerating] = useState(false)
  const [sendingLatest, setSendingLatest] = useState(false)
  const [emailingId, setEmailingId] = useState<string | null>(null)

  async function generateReport() {
    setGenerating(true)
    try {
      const res = await fetch('/api/reports', { method: 'POST' })
      const json = await res.json()
      const report = json.data
      toast.success(`Report generated: ${formatPeriod(report.period)}`)
      mutate()
    } catch {
      toast.error('Failed to generate report')
    } finally {
      setGenerating(false)
    }
  }

  async function sendLatest() {
    const sorted = [...(reports ?? [])].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )
    const latest = sorted[0]
    if (!latest) {
      toast.error('No reports to send')
      return
    }
    setSendingLatest(true)
    try {
      await fetch(`/api/reports/${latest.id}/email`, { method: 'POST' })
      toast.success(`Report emailed: ${formatPeriod(latest.period)}`)
      mutate()
    } catch {
      toast.error('Failed to send report')
    } finally {
      setSendingLatest(false)
    }
  }

  async function emailReport(id: string) {
    setEmailingId(id)
    try {
      await fetch(`/api/reports/${id}/email`, { method: 'POST' })
      toast.success('Report emailed')
      mutate()
    } catch {
      toast.error('Failed to email report')
    } finally {
      setEmailingId(null)
    }
  }

  const headerAction = (
    <div className="flex gap-2">
      <Button size="sm" variant="outline" onClick={sendLatest} disabled={sendingLatest}>
        <Mail className="h-4 w-4 mr-2" />
        {sendingLatest ? 'Sending...' : 'Send Latest'}
      </Button>
      <Button size="sm" onClick={generateReport} disabled={generating}>
        <RefreshCw className={`h-4 w-4 mr-2 ${generating ? 'animate-spin' : ''}`} />
        {generating ? 'Generating...' : 'Generate Weekly Report'}
      </Button>
    </div>
  )

  return (
    <div>
      <PageHeader title="Reports" action={headerAction} />

      {!reports || reports.length === 0 ? (
        <EmptyState
          icon={<FileText className="h-10 w-10" />}
          title="No reports yet"
          description="Generate your first weekly report to see metrics here."
          action={
            <Button onClick={generateReport} disabled={generating}>
              {generating ? 'Generating...' : 'Generate First Report'}
            </Button>
          }
        />
      ) : (
        <div className="space-y-3">
          {[...reports]
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
            .map(report => {
              const data = report.data as Record<string, number>
              return (
                <div key={report.id} className="bg-card border border-border rounded-lg p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span
                          className={`text-xs font-semibold px-2 py-0.5 rounded border ${
                            report.type === 'weekly'
                              ? 'bg-[#3B82F6]/10 text-[#3B82F6] border-[#3B82F6]/20'
                              : 'bg-[#C9A84C]/10 text-[#C9A84C] border-[#C9A84C]/20'
                          }`}
                        >
                          {report.type === 'weekly' ? 'Weekly' : 'Monthly'}
                        </span>
                        <span className="font-medium text-foreground">{formatPeriod(report.period)}</span>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Generated {formatDate(report.createdAt)}
                        {report.emailedAt && ` · Emailed ${formatDate(report.emailedAt)}`}
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => emailReport(report.id)}
                      disabled={emailingId === report.id}
                    >
                      <Mail className="h-3 w-3 mr-1" />
                      {emailingId === report.id ? 'Sending...' : 'Email'}
                    </Button>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div className="text-center">
                      <div className="text-lg font-bold font-mono text-[#10B981]">
                        {data.completedThisWeek ?? 0}
                      </div>
                      <div className="text-xs text-muted-foreground">Completed</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-bold font-mono text-[#EF4444]">
                        {data.overdueTasks ?? 0}
                      </div>
                      <div className="text-xs text-muted-foreground">Overdue</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-bold font-mono text-[#3B82F6]">
                        {data.openTasks ?? 0}
                      </div>
                      <div className="text-xs text-muted-foreground">Open</div>
                    </div>
                  </div>
                </div>
              )
            })}
        </div>
      )}
    </div>
  )
}
