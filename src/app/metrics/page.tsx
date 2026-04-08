'use client'
import useSWR from 'swr'
import { formatCrore, formatIndianNumber } from '@/lib/format'

const fetcher = (url: string) => fetch(url).then(r => r.json()).then(r => r.data ?? {})

function n(m: Record<string, number>, key: string, fallback = 0) {
  return m[key] ?? fallback
}

function pct(value: number) {
  return `${(value * 100).toFixed(1)}%`
}

function delta(value: number, isPercent = false) {
  const sign = value >= 0 ? '+' : ''
  const color = value >= 0 ? '#16a34a' : '#dc2626'
  const display = isPercent ? `${sign}${(value * 100).toFixed(1)}pp` : `${sign}${(value * 100).toFixed(1)}%`
  return <span style={{ color, fontWeight: 600 }}>{display}</span>
}

function AttainmentBar({ value, label }: { value: number; label: string }) {
  const capped = Math.min(Math.max(value, 0), 150)
  const barColor = value >= 100 ? '#16a34a' : value >= 75 ? 'var(--primary)' : 'var(--error)'
  const textColor = value >= 100 ? '#16a34a' : value >= 75 ? 'var(--primary)' : 'var(--error)'
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs" style={{ color: 'var(--on-surface-variant)' }}>
        <span>{label}</span>
        <span style={{ color: textColor, fontWeight: 600 }}>{value.toFixed(1)}%</span>
      </div>
      <div className="w-full rounded-full h-1.5" style={{ background: 'var(--surface-container)' }}>
        <div className="h-1.5 rounded-full transition-all" style={{ width: `${Math.min(capped, 100)}%`, background: barColor }} />
      </div>
    </div>
  )
}

function KpiCard({ label, value, sub, accent }: { label: string; value: React.ReactNode; sub?: string; accent?: string }) {
  return (
    <div
      className="p-5 rounded-xl"
      style={{
        background: 'var(--surface-container-lowest)',
        boxShadow: '0 8px 30px rgba(42,52,57,0.04)',
        border: '1px solid var(--surface-container)',
      }}
    >
      <p
        className="text-[10px] font-bold uppercase tracking-widest mb-2"
        style={{ color: 'var(--on-surface-variant)' }}
      >
        {label}
      </p>
      <p
        className="text-2xl font-extrabold"
        style={{ color: accent ?? 'var(--on-surface)', fontFamily: 'Manrope, sans-serif' }}
      >
        {value}
      </p>
      {sub && <p className="text-xs mt-1" style={{ color: 'var(--on-surface-variant)' }}>{sub}</p>}
    </div>
  )
}

function SectionHeader({ title, sub }: { title: string; sub: string }) {
  return (
    <div style={{ borderLeft: '3px solid var(--primary)', paddingLeft: '1rem' }}>
      <h2
        className="text-xl font-bold"
        style={{ color: 'var(--on-surface)', fontFamily: 'Manrope, sans-serif' }}
      >
        {title}
      </h2>
      <p className="text-xs mt-0.5" style={{ color: 'var(--on-surface-variant)' }}>{sub}</p>
    </div>
  )
}

function MixBar({ label, value, total, color }: { label: string; value: number; total: number; color: string }) {
  const pctVal = total > 0 ? (value / total) * 100 : 0
  return (
    <div className="flex items-center gap-3">
      <div className="w-28 text-xs truncate" style={{ color: 'var(--on-surface-variant)' }}>{label}</div>
      <div className="flex-1 rounded-full h-2" style={{ background: 'var(--surface-container)' }}>
        <div className={`h-2 rounded-full ${color}`} style={{ width: `${pctVal}%` }} />
      </div>
      <div className="w-16 text-right text-xs" style={{ color: 'var(--on-surface)' }}>{formatCrore(value)}</div>
      <div className="w-12 text-right text-xs" style={{ color: 'var(--on-surface-variant)' }}>{pctVal.toFixed(1)}%</div>
    </div>
  )
}

const cardStyle: React.CSSProperties = {
  background: 'var(--surface-container-lowest)',
  boxShadow: '0 8px 30px rgba(42,52,57,0.04)',
  border: '1px solid var(--surface-container)',
  borderRadius: '0.75rem',
}

export default function MetricsDashboard() {
  const { data: m = {}, isLoading } = useSWR('/api/metrics', fetcher)

  if (isLoading) {
    return (
      <div className="p-6 text-center py-24 text-sm" style={{ color: 'var(--on-surface-variant)' }}>
        Loading metrics...
      </div>
    )
  }

  const noData = Object.keys(m).length === 0

  if (noData) {
    return (
      <div className="p-6 space-y-4">
        <h1
          className="text-2xl font-bold"
          style={{ color: 'var(--on-surface)', fontFamily: 'Manrope, sans-serif' }}
        >
          Metrics Dashboard
        </h1>
        <div className="rounded-xl p-8 text-center space-y-3" style={cardStyle}>
          <p style={{ color: 'var(--on-surface-variant)' }}>No metrics synced yet.</p>
          <ol
            className="text-sm text-left inline-block space-y-1 list-decimal list-inside"
            style={{ color: 'var(--on-surface-variant)' }}
          >
            <li>Open your Google Sheet → Extensions → Apps Script</li>
            <li>Paste the contents of <code className="px-1 rounded" style={{ background: 'var(--surface-container)' }}>apps-script/Code.gs</code></li>
            <li>Run <code className="px-1 rounded" style={{ background: 'var(--surface-container)' }}>setupMetricsSheet()</code> to create the Metrics tab</li>
            <li>Deploy as Web App, copy the URL to <code className="px-1 rounded" style={{ background: 'var(--surface-container)' }}>SHEETS_SCRIPT_URL</code> env var</li>
            <li>Trigger the cron or call <code className="px-1 rounded" style={{ background: 'var(--surface-container)' }}>/api/cron/sheets-sync</code></li>
          </ol>
        </div>
      </div>
    )
  }

  // ── OTA values ──────────────────────────────────────────────────────────
  const grossGmv        = n(m, 'ota_gross_gmv_ytd')
  const netGmv          = n(m, 'ota_net_gmv_ytd')
  const cancRate        = n(m, 'ota_cancellation_rate')
  const aov             = n(m, 'ota_aov')
  const momGrowth       = n(m, 'ota_mom_growth')
  const yoyGrowth       = n(m, 'ota_yoy_growth')
  const channels = [
    { label: 'MMT',          value: n(m, 'ota_channel_mmt'),         color: 'bg-blue-500' },
    { label: 'Marriott',     value: n(m, 'ota_channel_marriott'),     color: 'bg-purple-500' },
    { label: 'Airbnb',       value: n(m, 'ota_channel_airbnb'),       color: 'bg-pink-500' },
    { label: 'booking.com',  value: n(m, 'ota_channel_bookingcom'),   color: 'bg-indigo-500' },
    { label: 'EaseMyTrip',   value: n(m, 'ota_channel_emt'),          color: 'bg-cyan-500' },
    { label: 'Other OTA',    value: n(m, 'ota_channel_other'),        color: 'bg-slate-500' },
  ]
  const regions = [
    { label: 'Goa',          value: n(m, 'ota_region_goa'),          color: 'bg-emerald-500' },
    { label: 'Maharashtra',  value: n(m, 'ota_region_maharashtra'),   color: 'bg-teal-500' },
    { label: 'North',        value: n(m, 'ota_region_north'),         color: 'bg-amber-500' },
    { label: 'South',        value: n(m, 'ota_region_south'),         color: 'bg-orange-500' },
  ]

  // ── Check-in values ─────────────────────────────────────────────────────
  const ciMonth         = n(m, 'ci_revenue_month')
  const ciYtd           = n(m, 'ci_revenue_ytd')
  const ciArrYtd        = n(m, 'ci_arr_ytd')
  const ciBnYtd         = n(m, 'ci_bn_count_ytd')
  const ciWeekdayShare  = n(m, 'ci_weekday_share_pct')
  const ciSegments = [
    {
      label: 'Weekday',
      revMonth: n(m, 'ci_revenue_weekday_month'), revYtd: n(m, 'ci_revenue_weekday_ytd'),
      arr: n(m, 'ci_arr_weekday_ytd'), bn: n(m, 'ci_bn_weekday_ytd'),
    },
    {
      label: 'Weekend',
      revMonth: n(m, 'ci_revenue_weekend_month'), revYtd: n(m, 'ci_revenue_weekend_ytd'),
      arr: n(m, 'ci_arr_weekend_ytd'), bn: n(m, 'ci_bn_weekend_ytd'),
    },
    {
      label: 'Peak',
      revMonth: n(m, 'ci_revenue_peak_month'), revYtd: n(m, 'ci_revenue_peak_ytd'),
      arr: n(m, 'ci_arr_peak_ytd'), bn: n(m, 'ci_bn_peak_ytd'),
    },
  ]

  // ── Funnel values ───────────────────────────────────────────────────────
  const leads           = n(m, 'fh_total_leads')
  const prospects       = n(m, 'fh_total_prospects')
  const bookings        = n(m, 'fh_total_bookings')
  const l2pPct          = n(m, 'fh_l2p_pct')
  const p2bPct          = n(m, 'fh_p2b_pct')
  const l2bPct          = n(m, 'fh_l2b_pct')
  const leadsAtt        = n(m, 'fh_leads_attainment')
  const bookingsAtt     = n(m, 'fh_bookings_attainment')
  const ciRevenueAtt    = n(m, 'fh_revenue_attainment')
  const prospectsAtt    = n(m, 'fh_prospects_attainment')
  const bookingAov      = n(m, 'fh_booking_aov')
  const bookingAovAtt   = n(m, 'fh_booking_aov_attainment')
  const revenuePerLead  = n(m, 'fh_revenue_per_lead')
  const l2pGap          = n(m, 'fh_l2p_gap')
  const p2bGap          = n(m, 'fh_p2b_gap')
  // ── New quality KPIs ────────────────────────────────────────────────────
  const otaMixPct           = n(m, 'ota_mix_pct')
  const weekendArrPremium   = n(m, 'ci_weekend_arr_premium')
  const peakArrPremium      = n(m, 'ci_peak_arr_premium')

  // ── Leading indicators ──────────────────────────────────────────────────
  const liLeadVol       = n(m, 'li_mom_lead_volume')
  const liL2p           = n(m, 'li_mom_l2p_trend')
  const liP2b           = n(m, 'li_mom_p2b_trend')

  return (
    <div className="p-6 space-y-10 max-w-6xl">
      <div>
        <h1
          className="text-3xl font-extrabold tracking-tight"
          style={{ color: 'var(--on-surface)', fontFamily: 'Manrope, sans-serif' }}
        >
          Metrics Dashboard
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--on-surface-variant)' }}>
          FY 2026–27 · Synced from Google Sheets
        </p>
      </div>

      {/* ── OTA ASSESSMENT ─────────────────────────────────────────────── */}
      <section className="space-y-5">
        <SectionHeader title="OTA Assessment" sub="Online travel agency performance — YTD" />

        {/* GMV Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <KpiCard label="Gross GMV YTD" value={formatCrore(grossGmv)} />
          <KpiCard label="Net GMV YTD" value={formatCrore(netGmv)} />
          <KpiCard label="Cancellation Rate" value={`${(cancRate * 100).toFixed(1)}%`} />
          <KpiCard label="YTD AOV" value={`₹${formatIndianNumber(aov)}`} sub="Net GMV ÷ Bookings" />
        </div>

        {/* Growth */}
        <div className="grid grid-cols-2 gap-4">
          <div className="rounded-xl p-5 flex items-center justify-between" style={cardStyle}>
            <span className="text-sm" style={{ color: 'var(--on-surface-variant)' }}>MoM Gross GMV Growth</span>
            <span className="text-lg font-semibold">{delta(momGrowth)}</span>
          </div>
          <div className="rounded-xl p-5 flex items-center justify-between" style={cardStyle}>
            <span className="text-sm" style={{ color: 'var(--on-surface-variant)' }}>YoY Gross GMV Growth</span>
            <span className="text-lg font-semibold">{delta(yoyGrowth)}</span>
          </div>
        </div>

        {/* Channel + Region Mix */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-xl p-5 space-y-3" style={cardStyle}>
            <p
              className="text-[10px] font-bold uppercase tracking-widest"
              style={{ color: 'var(--on-surface-variant)' }}
            >
              Channel Mix (Gross GMV)
            </p>
            {channels.map(c => (
              <MixBar key={c.label} label={c.label} value={c.value} total={grossGmv} color={c.color} />
            ))}
          </div>
          <div className="rounded-xl p-5 space-y-3" style={cardStyle}>
            <p
              className="text-[10px] font-bold uppercase tracking-widest"
              style={{ color: 'var(--on-surface-variant)' }}
            >
              Region Mix (Gross GMV)
            </p>
            {regions.map(r => (
              <MixBar key={r.label} label={r.label} value={r.value} total={grossGmv} color={r.color} />
            ))}
          </div>
        </div>
      </section>

      {/* ── CHECK-IN GMV ───────────────────────────────────────────────── */}
      <section className="space-y-5">
        <SectionHeader title="Check-in GMV" sub="Revenue by occupied/check-in date" />

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <KpiCard label="Revenue (Month)" value={formatCrore(ciMonth)} sub="Occupied month" />
          <KpiCard label="Revenue YTD" value={formatCrore(ciYtd)} />
          <KpiCard label="ARR YTD" value={`₹${formatIndianNumber(ciArrYtd)}`} sub="Avg room rate" />
          <KpiCard label="Bedroom Nights YTD" value={formatIndianNumber(ciBnYtd)} sub={`Weekday ${pct(ciWeekdayShare)}`} />
        </div>

        {/* ARR Premiums */}
        {(weekendArrPremium > 0 || peakArrPremium > 0) && (
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-xl p-5 flex items-center justify-between" style={cardStyle}>
              <div>
                <p className="text-xs" style={{ color: 'var(--on-surface-variant)' }}>Weekend ARR Premium</p>
                <p className="text-xs" style={{ color: 'var(--on-surface-variant)' }}>vs Weekday</p>
              </div>
              <span className="text-xl font-semibold" style={{ color: '#16a34a' }}>{weekendArrPremium.toFixed(2)}x</span>
            </div>
            <div className="rounded-xl p-5 flex items-center justify-between" style={cardStyle}>
              <div>
                <p className="text-xs" style={{ color: 'var(--on-surface-variant)' }}>Peak ARR Premium</p>
                <p className="text-xs" style={{ color: 'var(--on-surface-variant)' }}>vs Weekday</p>
              </div>
              <span className="text-xl font-semibold" style={{ color: 'var(--tertiary)' }}>{peakArrPremium.toFixed(2)}x</span>
            </div>
          </div>
        )}

        {/* Weekday / Weekend / Peak breakdown */}
        <div className="rounded-xl overflow-hidden" style={cardStyle}>
          <table className="w-full text-sm">
            <thead style={{ background: 'var(--surface-container-low)' }}>
              <tr>
                {['Segment', 'Rev (Month)', 'Rev YTD', 'ARR YTD', 'BN Count YTD'].map(h => (
                  <th
                    key={h}
                    className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide"
                    style={{ color: 'var(--on-surface-variant)' }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ciSegments.map((seg, i) => (
                <tr
                  key={seg.label}
                  style={{ borderTop: i > 0 ? '1px solid var(--surface-container)' : 'none' }}
                  onMouseEnter={e => ((e.currentTarget as HTMLTableRowElement).style.background = 'var(--surface-container-low)')}
                  onMouseLeave={e => ((e.currentTarget as HTMLTableRowElement).style.background = 'transparent')}
                >
                  <td className="px-4 py-3 font-medium" style={{ color: 'var(--on-surface)' }}>{seg.label}</td>
                  <td className="px-4 py-3" style={{ color: 'var(--on-surface-variant)' }}>{formatCrore(seg.revMonth)}</td>
                  <td className="px-4 py-3" style={{ color: 'var(--on-surface-variant)' }}>{formatCrore(seg.revYtd)}</td>
                  <td className="px-4 py-3" style={{ color: 'var(--on-surface-variant)' }}>₹{formatIndianNumber(seg.arr)}</td>
                  <td className="px-4 py-3" style={{ color: 'var(--on-surface-variant)' }}>{formatIndianNumber(seg.bn)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* ── FUNNEL HEALTH ──────────────────────────────────────────────── */}
      <section className="space-y-5">
        <SectionHeader title="Funnel Health" sub="Leads → Prospects → Bookings — YTD" />

        {/* Funnel visual */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { stage: 'Leads',      count: leads,     conv: null },
            { stage: 'Prospects',  count: prospects, conv: `L2P: ${pct(l2pPct)}` },
            { stage: 'Bookings',   count: bookings,  conv: `P2B: ${pct(p2bPct)}` },
          ].map(({ stage, count, conv }) => (
            <div key={stage} className="rounded-xl p-5 text-center space-y-1" style={cardStyle}>
              <p
                className="text-[10px] font-bold uppercase tracking-widest"
                style={{ color: 'var(--on-surface-variant)' }}
              >
                {stage}
              </p>
              <p
                className="text-2xl font-bold"
                style={{ color: 'var(--on-surface)', fontFamily: 'Manrope, sans-serif' }}
              >
                {formatIndianNumber(count)}
              </p>
              {conv && <p className="text-xs" style={{ color: 'var(--on-surface-variant)' }}>{conv}</p>}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Conversion rates */}
          <div className="rounded-xl p-5 space-y-4" style={cardStyle}>
            <p
              className="text-[10px] font-bold uppercase tracking-widest"
              style={{ color: 'var(--on-surface-variant)' }}
            >
              Conversion Rates
            </p>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm" style={{ color: 'var(--on-surface-variant)' }}>L2P%</span>
                <span className="font-semibold" style={{ color: 'var(--on-surface)' }}>{pct(l2pPct)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm" style={{ color: 'var(--on-surface-variant)' }}>P2B%</span>
                <span className="font-semibold" style={{ color: 'var(--on-surface)' }}>{pct(p2bPct)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm" style={{ color: 'var(--on-surface-variant)' }}>L2B% (end-to-end)</span>
                <span className="font-semibold" style={{ color: 'var(--on-surface)' }}>{pct(l2bPct)}</span>
              </div>
              {l2pGap !== 0 && (
                <div
                  className="flex justify-between text-sm pt-1"
                  style={{ borderTop: '1px solid var(--surface-container)' }}
                >
                  <span style={{ color: 'var(--on-surface-variant)' }}>L2P% Gap vs Target</span>
                  {delta(l2pGap, true)}
                </div>
              )}
              {p2bGap !== 0 && (
                <div className="flex justify-between text-sm">
                  <span style={{ color: 'var(--on-surface-variant)' }}>P2B% Gap vs Target</span>
                  {delta(p2bGap, true)}
                </div>
              )}
            </div>
          </div>

          {/* Attainment vs Target */}
          <div className="rounded-xl p-5 space-y-4" style={cardStyle}>
            <p
              className="text-[10px] font-bold uppercase tracking-widest"
              style={{ color: 'var(--on-surface-variant)' }}
            >
              Attainment vs Target
            </p>
            {ciRevenueAtt > 0 && <AttainmentBar value={ciRevenueAtt} label="CI Revenue Attainment" />}
            {leadsAtt > 0 && <AttainmentBar value={leadsAtt} label="Leads Attainment" />}
            {prospectsAtt > 0 && <AttainmentBar value={prospectsAtt} label="Prospects Attainment" />}
            {bookingsAtt > 0 && <AttainmentBar value={bookingsAtt} label="Bookings Attainment" />}
            {bookingAovAtt > 0 && <AttainmentBar value={bookingAovAtt} label="Booking AOV Attainment" />}
            {ciRevenueAtt === 0 && leadsAtt === 0 && (
              <p className="text-xs" style={{ color: 'var(--on-surface-variant)' }}>
                Sync data from Google Sheets to see attainment.
              </p>
            )}
          </div>
        </div>

        {/* Efficiency KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {bookingAov > 0 && (
            <KpiCard
              label="Booking AOV (actual)"
              value={`₹${formatIndianNumber(Math.round(bookingAov))}`}
              sub="CI Rev ÷ Bookings"
            />
          )}
          {revenuePerLead > 0 && (
            <KpiCard
              label="Revenue per Lead"
              value={`₹${formatIndianNumber(Math.round(revenuePerLead))}`}
              sub="CI Rev ÷ Total Leads"
            />
          )}
          {otaMixPct > 0 && (
            <KpiCard
              label="OTA Mix % of CI Revenue"
              value={`${otaMixPct.toFixed(1)}%`}
              sub="OTA Gross GMV ÷ CI Rev YTD"
            />
          )}
        </div>
      </section>

      {/* ── LEADING INDICATORS ─────────────────────────────────────────── */}
      <section className="space-y-5">
        <SectionHeader title="Leading Indicators" sub="Month-over-month trends" />

        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'MoM Lead Volume',  value: liLeadVol },
            { label: 'MoM L2P% Trend',   value: liL2p },
            { label: 'MoM P2B% Trend',   value: liP2b },
          ].map(({ label, value }) => (
            <div key={label} className="rounded-xl p-5 text-center space-y-1" style={cardStyle}>
              <p className="text-xs" style={{ color: 'var(--on-surface-variant)' }}>{label}</p>
              <p className="text-xl font-semibold">{delta(value)}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
