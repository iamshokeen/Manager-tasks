'use client'
import useSWR from 'swr'
import { useState } from 'react'
import { PageHeader } from '@/components/ui/page-header'
import { EmptyState } from '@/components/ui/empty-state'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { formatPeriod } from '@/lib/format'
import { formatDate } from '@/lib/utils'
import { FileText, Mail, RefreshCw, Clock, CheckCircle2, AlertCircle, Circle } from 'lucide-react'

interface Report {
  id: string
  type: string
  period: string
  data: unknown
  createdAt: string
  emailedAt?: string | null
}

const fetcher = (url: string) => fetch(url).then(r => r.json()).then(r => r.data)

const cardStyle: React.CSSProperties = {
  background: 'var(--surface-container-lowest)',
  boxShadow: 'var(--shadow-card)',
  borderRadius: '0.75rem',
}

function ReportTypeBadge({ type }: { type: string }) {
  const isWeekly = type === 'weekly'
  return (
    <span
      className="text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wide"
      style={{
        background: isWeekly ? 'var(--primary-container)' : 'var(--tertiary-container)',
        color: isWeekly ? 'var(--on-primary-container)' : 'var(--on-tertiary-container)',
      }}
    >
      {isWeekly ? 'Weekly' : 'Monthly'}
    </span>
  )
}

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

  const sortedReports = [...(reports ?? [])].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )

  return (
    <div className="flex flex-col gap-6">
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
        <div className="space-y-4">
          {/* Latest report — featured card */}
          {sortedReports.slice(0, 1).map(report => {
            const data = report.data as Record<string, number>
            return (
              <div
                key={report.id}
                className="rounded-xl p-8 relative overflow-hidden"
                style={cardStyle}
              >
                {/* Decorative blur */}
                <div
                  className="absolute top-0 right-0 w-64 h-64 rounded-full pointer-events-none blur-3xl"
                  style={{
                    background: 'rgba(0,83,219,0.05)',
                    transform: 'translate(50%,-50%)',
                  }}
                />
                <div className="relative z-10">
                  <div className="flex justify-between items-start mb-6 flex-wrap gap-3">
                    <div className="flex items-center gap-3">
                      <ReportTypeBadge type={report.type} />
                      <div
                        className="flex items-center gap-1.5 text-xs"
                        style={{ color: 'var(--on-surface-variant)' }}
                      >
                        <Clock className="h-3.5 w-3.5" />
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
                  <h3
                    className="text-3xl font-extrabold tracking-tight mb-6"
                    style={{ color: 'var(--on-surface)', fontFamily: 'Manrope, sans-serif' }}
                  >
                    {formatPeriod(report.period)}
                  </h3>
                  <div className="grid grid-cols-3 gap-6">
                    <div
                      className="p-5 rounded-xl"
                      style={{ background: 'var(--surface-container-low)' }}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <CheckCircle2 className="h-4 w-4" style={{ color: '#16a34a' }} />
                        <span className="text-xs uppercase tracking-widest font-medium" style={{ color: 'var(--on-surface-variant)' }}>
                          Completed
                        </span>
                      </div>
                      <div
                        className="text-3xl font-extrabold"
                        style={{ color: '#16a34a', fontFamily: 'Manrope, sans-serif' }}
                      >
                        {data.completedThisWeek ?? 0}
                      </div>
                    </div>
                    <div
                      className="p-5 rounded-xl"
                      style={{ background: 'var(--surface-container-low)' }}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <AlertCircle className="h-4 w-4" style={{ color: 'var(--error)' }} />
                        <span className="text-xs uppercase tracking-widest font-medium" style={{ color: 'var(--on-surface-variant)' }}>
                          Overdue
                        </span>
                      </div>
                      <div
                        className="text-3xl font-extrabold"
                        style={{ color: 'var(--error)', fontFamily: 'Manrope, sans-serif' }}
                      >
                        {data.overdueTasks ?? 0}
                      </div>
                    </div>
                    <div
                      className="p-5 rounded-xl"
                      style={{ background: 'var(--surface-container-low)' }}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <Circle className="h-4 w-4" style={{ color: 'var(--primary)' }} />
                        <span className="text-xs uppercase tracking-widest font-medium" style={{ color: 'var(--on-surface-variant)' }}>
                          Open
                        </span>
                      </div>
                      <div
                        className="text-3xl font-extrabold"
                        style={{ color: 'var(--primary)', fontFamily: 'Manrope, sans-serif' }}
                      >
                        {data.openTasks ?? 0}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}

          {/* Remaining reports — compact list */}
          {sortedReports.length > 1 && (
            <div>
              <h3
                className="text-sm font-semibold mb-3"
                style={{ color: 'var(--on-surface-variant)', fontFamily: 'Manrope, sans-serif' }}
              >
                History
              </h3>
              <div className="space-y-2">
                {sortedReports.slice(1).map(report => {
                  const data = report.data as Record<string, number>
                  return (
                    <div
                      key={report.id}
                      className="rounded-xl px-5 py-4"
                      style={cardStyle}
                    >
                      <div className="flex items-center justify-between flex-wrap gap-3">
                        <div className="flex items-center gap-3">
                          <ReportTypeBadge type={report.type} />
                          <div>
                            <span
                              className="font-semibold text-sm"
                              style={{ color: 'var(--on-surface)' }}
                            >
                              {formatPeriod(report.period)}
                            </span>
                            <div className="text-xs mt-0.5" style={{ color: 'var(--on-surface-variant)' }}>
                              Generated {formatDate(report.createdAt)}
                              {report.emailedAt && ` · Emailed ${formatDate(report.emailedAt)}`}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-6">
                          <div className="flex items-center gap-4 text-sm">
                            <span style={{ color: '#16a34a', fontWeight: 700 }}>
                              ✓ {data.completedThisWeek ?? 0}
                            </span>
                            <span style={{ color: 'var(--error)', fontWeight: 700 }}>
                              ⚠ {data.overdueTasks ?? 0}
                            </span>
                            <span style={{ color: 'var(--primary)', fontWeight: 700 }}>
                              ○ {data.openTasks ?? 0}
                            </span>
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
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
