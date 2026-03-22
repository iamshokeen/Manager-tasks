'use client'
import useSWR from 'swr'
import { formatCrore } from '@/lib/format'

const fetcher = (url: string) => fetch(url).then(r => r.json())
const MONTHS = ['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar']

function pct(actual: number, target: number) {
  if (!target) return 0
  return Math.round((actual / target) * 100)
}

function ProgressBar({ value }: { value: number }) {
  const color = value >= 100 ? 'bg-green-500' : value >= 75 ? 'bg-yellow-500' : 'bg-red-500'
  return (
    <div className="w-full bg-muted rounded-full h-2">
      <div className={`h-2 rounded-full ${color}`} style={{ width: `${Math.min(value, 100)}%` }} />
    </div>
  )
}

export default function CheckinAssessmentPage() {
  const { data: tData } = useSWR('/api/targets', fetcher)
  const { data: mData } = useSWR('/api/metrics', fetcher)

  const targets = tData?.targets?.checkin
  const metrics: Record<string, number> = mData?.data || {}

  const actualTotal = metrics['ci_revenue_ytd']          || 0
  const actualGoa   = metrics['ci_goa_ytd']              || 0
  const actualMaha  = metrics['ci_maha_ytd']             || 0
  const actualNorth = metrics['ci_north_ytd']            || 0
  const actualWkday = metrics['ci_revenue_weekday_ytd']  || 0
  const actualWkend = metrics['ci_revenue_weekend_ytd']  || 0

  return (
    <div className="p-6 space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Check-in GMV Assessment</h1>
        <p className="text-muted-foreground text-sm mt-1">FY 2026-27 — Targets vs Actuals</p>
      </div>

      {!targets ? (
        <div className="text-muted-foreground text-center py-16">
          No targets loaded. Go to Settings → Upload Targets CSV.
        </div>
      ) : (
        <>
          {/* YTD Summary */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'Total Check-in GMV YTD', actual: actualTotal, target: targets.ytd.total },
              { label: 'Goa GMV YTD', actual: actualGoa, target: targets.ytd.goa },
              { label: 'Maharashtra GMV YTD', actual: actualMaha, target: targets.ytd.maharashtra },
              { label: 'North GMV YTD', actual: actualNorth, target: targets.ytd.north },
            ].map(({ label, actual, target }) => {
              const p = pct(actual, target)
              return (
                <div key={label} className="bg-card border border-border rounded-xl p-5 space-y-3">
                  <p className="text-sm text-muted-foreground">{label}</p>
                  <p className="text-xl font-bold text-foreground">{formatCrore(actual)}</p>
                  <p className="text-xs text-muted-foreground">Target: {formatCrore(target)}</p>
                  <ProgressBar value={p} />
                  <p className={`text-sm font-semibold ${p >= 100 ? 'text-green-400' : p >= 75 ? 'text-yellow-400' : 'text-red-400'}`}>
                    {p}% achieved
                  </p>
                </div>
              )
            })}
          </div>

          {/* Weekday vs Weekend */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { label: 'Weekday GMV YTD', actual: actualWkday },
              { label: 'Weekend GMV YTD', actual: actualWkend },
            ].map(({ label, actual }) => (
              <div key={label} className="bg-card border border-border rounded-xl p-5">
                <p className="text-sm text-muted-foreground">{label}</p>
                <p className="text-2xl font-bold text-foreground mt-2">{formatCrore(actual)}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {actualTotal ? Math.round((actual / actualTotal) * 100) : 0}% of total
                </p>
              </div>
            ))}
          </div>

          {/* Monthly Table */}
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-border">
              <h2 className="font-semibold text-foreground">Monthly Check-in GMV Target</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="text-left px-4 py-3 text-muted-foreground font-medium">Month</th>
                    <th className="text-right px-4 py-3 text-muted-foreground font-medium">Total</th>
                    <th className="text-right px-4 py-3 text-muted-foreground font-medium">Goa</th>
                    <th className="text-right px-4 py-3 text-muted-foreground font-medium">Maharashtra</th>
                    <th className="text-right px-4 py-3 text-muted-foreground font-medium">North</th>
                  </tr>
                </thead>
                <tbody>
                  {MONTHS.map((month) => (
                    <tr key={month} className="border-b border-border/50 hover:bg-muted/20">
                      <td className="px-4 py-3 text-foreground font-medium">{month}</td>
                      <td className="px-4 py-3 text-right text-foreground">{formatCrore(targets.total[month] || 0)}</td>
                      <td className="px-4 py-3 text-right text-foreground">{formatCrore(targets.goa[month] || 0)}</td>
                      <td className="px-4 py-3 text-right text-foreground">{formatCrore(targets.maharashtra[month] || 0)}</td>
                      <td className="px-4 py-3 text-right text-foreground">{formatCrore(targets.north[month] || 0)}</td>
                    </tr>
                  ))}
                  <tr className="bg-muted/30 font-semibold">
                    <td className="px-4 py-3 text-foreground">YTD Total</td>
                    <td className="px-4 py-3 text-right text-primary">{formatCrore(targets.ytd.total)}</td>
                    <td className="px-4 py-3 text-right text-primary">{formatCrore(targets.ytd.goa)}</td>
                    <td className="px-4 py-3 text-right text-primary">{formatCrore(targets.ytd.maharashtra)}</td>
                    <td className="px-4 py-3 text-right text-primary">{formatCrore(targets.ytd.north)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
