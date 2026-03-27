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
  const pctVal = Math.min(value, 150)
  const color = value >= 100 ? 'bg-green-500' : value >= 75 ? 'bg-yellow-500' : 'bg-red-500'
  return (
    <div className="w-full bg-muted rounded-full h-2">
      <div className={`h-2 rounded-full ${color}`} style={{ width: `${Math.min(pctVal, 100)}%` }} />
    </div>
  )
}

export default function OTAAssessmentPage() {
  const { data: tData } = useSWR('/api/targets', fetcher)
  const { data: mData } = useSWR('/api/metrics', fetcher)

  const targets = tData?.targets?.ota
  const metrics: Record<string, number> = mData?.data || {}

  const actualGrossYtd = metrics['ota_gross_gmv_ytd']  || 0
  const actualRevYtd   = metrics['ota_net_gmv_ytd']    || 0
  const actualMmtYtd   = metrics['ota_channel_mmt']    || 0

  return (
    <div className="p-6 space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Channel Pulse</h1>
        <p className="text-muted-foreground text-sm mt-1">FY 2026-27 — How your revenue channels are performing.</p>
      </div>

      {!targets ? (
        <div className="text-muted-foreground text-center py-16">
          No targets loaded. Go to Settings → Upload Targets CSV.
        </div>
      ) : (
        <>
          {/* YTD Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { label: 'OTA Gross GMV YTD', actual: actualGrossYtd, target: targets.ytd.revenue },
              { label: 'OTA Net Revenue YTD', actual: actualRevYtd, target: targets.ytd.revenue * 0.9 },
              { label: 'MMT Revenue YTD', actual: actualMmtYtd, target: targets.ytd.revenue * 0.8 },
            ].map(({ label, actual, target }) => {
              const p = pct(actual, target)
              return (
                <div key={label} className="bg-card border border-border rounded-xl p-5 space-y-3">
                  <p className="text-sm text-muted-foreground">{label}</p>
                  <p className="text-2xl font-bold text-foreground">{formatCrore(actual)}</p>
                  <p className="text-xs text-muted-foreground">Target: {formatCrore(target)}</p>
                  <ProgressBar value={p} />
                  <p className={`text-sm font-semibold ${p >= 100 ? 'text-green-400' : p >= 75 ? 'text-yellow-400' : 'text-red-400'}`}>
                    {p}% achieved
                  </p>
                </div>
              )
            })}
          </div>

          {/* Monthly Revenue Table */}
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-border">
              <h2 className="font-semibold text-foreground">Monthly OTA Revenue Target</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="text-left px-4 py-3 text-muted-foreground font-medium">Month</th>
                    <th className="text-right px-4 py-3 text-muted-foreground font-medium">Target</th>
                    <th className="text-right px-4 py-3 text-muted-foreground font-medium">Bookings Target</th>
                    <th className="text-right px-4 py-3 text-muted-foreground font-medium">Leads Target</th>
                  </tr>
                </thead>
                <tbody>
                  {MONTHS.map((month) => (
                    <tr key={month} className="border-b border-border/50 hover:bg-muted/20">
                      <td className="px-4 py-3 text-foreground font-medium">{month}</td>
                      <td className="px-4 py-3 text-right text-foreground">{formatCrore(targets.revenue[month] || 0)}</td>
                      <td className="px-4 py-3 text-right text-foreground">{Math.round(targets.bookings[month] || 0)}</td>
                      <td className="px-4 py-3 text-right text-foreground">{Math.round(targets.leads[month] || 0)}</td>
                    </tr>
                  ))}
                  <tr className="bg-muted/30 font-semibold">
                    <td className="px-4 py-3 text-foreground">YTD Total</td>
                    <td className="px-4 py-3 text-right text-primary">{formatCrore(targets.ytd.revenue)}</td>
                    <td className="px-4 py-3 text-right text-primary">{Math.round(targets.ytd.bookings)}</td>
                    <td className="px-4 py-3 text-right text-primary">{Math.round(targets.ytd.leads)}</td>
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
