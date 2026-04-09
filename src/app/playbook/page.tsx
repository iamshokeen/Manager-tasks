'use client'
import { useState } from 'react'

interface SopCard {
  id: string
  title: string
  description: string
  status: 'active' | 'review' | 'archived'
}

interface FrameworkCard {
  label: string
  text: string
  border: string
}

function AccordionSection({
  icon,
  iconBg,
  iconColor,
  title,
  subtitle,
  children,
  defaultOpen = false,
}: {
  icon: string
  iconBg: string
  iconColor: string
  title: string
  subtitle: string
  children: React.ReactNode
  defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{
        background: 'var(--surface-container-lowest)',
        boxShadow: '0 8px 30px rgb(42,52,57,0.04)',
        border: '1px solid rgba(169,180,185,0.1)',
      }}
    >
      <div
        className="flex items-center justify-between p-6 cursor-pointer transition-colors"
        style={{ background: open ? 'rgba(240,244,247,0.8)' : 'rgba(240,244,247,0.5)' }}
        onClick={() => setOpen(!open)}
        onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.background = 'rgba(240,244,247,0.8)' }}
        onMouseLeave={e => { if (!open) (e.currentTarget as HTMLDivElement).style.background = 'rgba(240,244,247,0.5)' }}
      >
        <div className="flex items-center gap-4">
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center"
            style={{ background: iconBg, color: iconColor }}
          >
            <span className="material-symbols-outlined">{icon}</span>
          </div>
          <div>
            <h3 className="text-lg font-bold" style={{ fontFamily: 'Manrope, sans-serif', color: 'var(--on-surface)' }}>{title}</h3>
            <p className="text-xs" style={{ color: 'var(--on-surface-variant)' }}>{subtitle}</p>
          </div>
        </div>
        <span
          className="material-symbols-outlined transition-transform duration-200"
          style={{ color: 'var(--outline)', transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}
        >
          expand_more
        </span>
      </div>
      {open && (
        <div className="p-8" style={{ borderTop: '1px solid rgba(169,180,185,0.05)' }}>
          {children}
        </div>
      )}
    </div>
  )
}

const SOPS: SopCard[] = [
  { id: 'SOP-042', title: 'Cloud Infrastructure Migration', description: 'Step-by-step migration guide for legacy databases to AWS instances.', status: 'active' },
  { id: 'SOP-109', title: 'Executive Talent Acquisition', description: 'Standardized interview matrix and vetting process for C-suite roles.', status: 'review' },
  { id: 'SOP-071', title: 'Incident Response Protocol', description: 'L1-L4 severity triage system with automated escalation paths.', status: 'active' },
  { id: 'SOP-088', title: 'Quarterly Business Review Format', description: 'Structured agenda and KPI reporting framework for QBRs.', status: 'active' },
]

const FRAMEWORKS: FrameworkCard[] = [
  { label: 'Objective-Driven', text: 'Clear OKRs updated bi-weekly.', border: 'var(--primary)' },
  { label: 'Feedback Loops', text: 'Continuous performance streams.', border: 'var(--tertiary)' },
  { label: 'Scale Logic', text: 'Modular growth parameters.', border: 'var(--secondary)' },
]

const RECENTEDITS = [
  { icon: 'edit', iconBg: 'rgba(0,83,219,0.1)', iconColor: 'var(--primary)', title: 'Updated SOP-042', meta: '2 hours ago • by Alex S.' },
  { icon: 'add_circle', iconBg: 'rgba(134,84,0,0.1)', iconColor: 'var(--tertiary)', title: 'New Management Framework', meta: 'Yesterday • by Sarah K.' },
  { icon: 'delete', iconBg: 'rgba(159,64,61,0.1)', iconColor: 'var(--error)', title: 'Archived SOP-012', meta: 'Oct 24 • by System' },
]

export default function PlaybookPage() {
  return (
    <div className="space-y-6">
      {/* Hero header */}
      <div className="flex items-end justify-between mb-4">
        <div>
          <h2
            className="text-4xl font-extrabold tracking-tight mb-2"
            style={{ fontFamily: 'Manrope, sans-serif', color: 'var(--on-surface)' }}
          >
            Operational Frameworks
          </h2>
          <p className="max-w-2xl text-sm" style={{ color: 'var(--on-surface-variant)' }}>
            The core architectural blueprints for organizational efficiency. High-density access to established standard operating procedures and management playbooks.
          </p>
        </div>
        <div
          className="flex items-center gap-2 px-4 py-2 rounded-lg"
          style={{ background: 'rgba(248,160,16,0.1)', border: '1px solid rgba(248,160,16,0.2)' }}
        >
          <span className="material-symbols-outlined" style={{ color: 'var(--tertiary)', fontVariationSettings: "'FILL' 1" }}>verified_user</span>
          <span className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--tertiary)' }}>SUPER_ADMIN Access Only</span>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* Main Accordion Area */}
        <div className="col-span-12 lg:col-span-8 space-y-4">
          {/* Operating Procedures */}
          <AccordionSection
            icon="settings_suggest"
            iconBg="var(--primary-container)"
            iconColor="var(--primary)"
            title="Operating Procedures"
            subtitle="Standard runtime parameters for cross-functional teams"
            defaultOpen
          >
            <div className="space-y-6">
              <div className="space-y-3">
                <h4 className="text-md font-bold flex items-center gap-2" style={{ color: 'var(--primary)' }}>
                  <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: 'var(--primary)' }} />
                  Incident Response Protocol
                </h4>
                <div className="p-4 rounded-lg space-y-2" style={{ background: 'var(--surface-container-low)' }}>
                  <ul className="space-y-2 text-sm" style={{ color: 'var(--on-surface-variant)' }}>
                    <li className="flex gap-2"><span className="font-bold" style={{ color: 'var(--on-surface)' }}>Triage Phase:</span> Identify the severity level (L1-L4) within 15 minutes of initial trigger detection.</li>
                    <li className="flex gap-2"><span className="font-bold" style={{ color: 'var(--on-surface)' }}>Escalation Path:</span> Auto-notify relevant Lead Architect if uptime drops below the 99.9% threshold.</li>
                    <li className="flex gap-2"><span className="font-bold" style={{ color: 'var(--on-surface)' }}>Post-Mortem:</span> Every incident requires a full technical audit within 24 hours of resolution.</li>
                  </ul>
                </div>
              </div>
              <div className="space-y-3">
                <h4 className="text-md font-bold flex items-center gap-2" style={{ color: 'var(--primary)' }}>
                  <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: 'var(--primary)' }} />
                  Quality Assurance Cycle
                </h4>
                <p className="text-sm leading-relaxed pl-3.5" style={{ color: 'var(--on-surface-variant)' }}>
                  All modular components must undergo rigorous testing before being merged into the master ledger. This includes peer reviews, automated unit tests, and performance benchmarking.
                </p>
              </div>
            </div>
          </AccordionSection>

          {/* SOP Library */}
          <AccordionSection
            icon="library_books"
            iconBg="rgba(248,160,16,0.2)"
            iconColor="var(--tertiary)"
            title="SOP Library"
            subtitle="Validated procedures for recurring task execution"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {SOPS.map(sop => (
                <div
                  key={sop.id}
                  className="p-4 rounded-xl transition-all"
                  style={{ border: '1px solid rgba(169,180,185,0.1)' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.background = 'rgba(0,83,219,0.03)' }}
                  onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = 'transparent' }}
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[10px] uppercase font-bold tracking-widest" style={{ color: 'var(--on-surface-variant)' }}>{sop.id}</span>
                    <span
                      className="px-2 py-0.5 text-[10px] font-bold rounded-full uppercase"
                      style={
                        sop.status === 'active'
                          ? { background: 'rgba(16,185,129,0.1)', color: '#059669' }
                          : { background: 'rgba(248,160,16,0.15)', color: 'var(--tertiary)' }
                      }
                    >
                      {sop.status.toUpperCase()}
                    </span>
                  </div>
                  <h5 className="font-bold text-sm mb-2" style={{ color: 'var(--on-surface)' }}>{sop.title}</h5>
                  <p className="text-xs mb-4" style={{ color: 'var(--on-surface-variant)' }}>{sop.description}</p>
                  <button className="text-[10px] font-black uppercase tracking-tighter flex items-center gap-1" style={{ color: 'var(--primary)' }}>
                    View Protocol <span className="material-symbols-outlined text-xs">arrow_forward</span>
                  </button>
                </div>
              ))}
            </div>
          </AccordionSection>

          {/* Management Frameworks */}
          <AccordionSection
            icon="account_tree"
            iconBg="rgba(213,227,252,0.5)"
            iconColor="var(--secondary)"
            title="Management Frameworks"
            subtitle="Decision-making structures and organizational charts"
          >
            <div className="space-y-4">
              <p className="text-sm mb-4" style={{ color: 'var(--on-surface-variant)' }}>
                Our management philosophy adheres to the <strong style={{ color: 'var(--on-surface)' }}>Asymmetric Execution</strong> model, prioritizing high-leverage activities through decentralized decision-making.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {FRAMEWORKS.map(f => (
                  <div
                    key={f.label}
                    className="p-4 rounded-lg"
                    style={{ background: 'var(--surface)', borderLeft: `4px solid ${f.border}` }}
                  >
                    <p className="text-xs font-bold mb-1" style={{ color: 'var(--on-surface)' }}>{f.label}</p>
                    <p className="text-[11px]" style={{ color: 'var(--on-surface-variant)' }}>{f.text}</p>
                  </div>
                ))}
              </div>
            </div>
          </AccordionSection>
        </div>

        {/* Right Side Widgets */}
        <div className="col-span-12 lg:col-span-4 space-y-6">
          {/* Command Metrics */}
          <div
            className="rounded-xl p-6"
            style={{ background: 'var(--surface-container)', border: '1px solid rgba(169,180,185,0.1)' }}
          >
            <h4
              className="text-sm font-black uppercase tracking-widest mb-4"
              style={{ fontFamily: 'Manrope, sans-serif', color: 'var(--on-surface)' }}
            >
              Command Metrics
            </h4>
            <div className="space-y-4">
              {[
                { label: 'Total Playbooks', value: '128', progress: 75, color: 'var(--primary)' },
                { label: 'Compliance Rating', value: '98.4%', progress: 98, color: '#10b981' },
                { label: 'Active Frameworks', value: '12', progress: 60, color: 'var(--primary)' },
              ].map(m => (
                <div key={m.label}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium" style={{ color: 'var(--on-surface-variant)' }}>{m.label}</span>
                    <span
                      className="text-lg font-bold"
                      style={{ fontFamily: 'Manrope, sans-serif', color: m.color === '#10b981' ? '#059669' : 'var(--on-surface)' }}
                    >
                      {m.value}
                    </span>
                  </div>
                  <div className="w-full h-1 rounded-full overflow-hidden" style={{ background: 'rgba(169,180,185,0.2)' }}>
                    <div className="h-full rounded-full" style={{ width: `${m.progress}%`, background: m.color }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Edits */}
          <div
            className="rounded-xl p-6"
            style={{
              background: 'var(--surface-container-lowest)',
              boxShadow: '0 8px 30px rgb(42,52,57,0.04)',
              border: '1px solid rgba(169,180,185,0.1)',
            }}
          >
            <h4
              className="text-sm font-black uppercase tracking-widest mb-6"
              style={{ fontFamily: 'Manrope, sans-serif', color: 'var(--on-surface)' }}
            >
              Recent Edits
            </h4>
            <div className="space-y-6">
              {RECENTEDITS.map(item => (
                <div key={item.title} className="flex gap-4">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
                    style={{ background: item.iconBg }}
                  >
                    <span className="material-symbols-outlined text-sm" style={{ color: item.iconColor }}>{item.icon}</span>
                  </div>
                  <div>
                    <p className="text-xs font-bold" style={{ color: 'var(--on-surface)' }}>{item.title}</p>
                    <p className="text-[10px]" style={{ color: 'var(--on-surface-variant)' }}>{item.meta}</p>
                  </div>
                </div>
              ))}
            </div>
            <button
              className="w-full mt-6 py-2 rounded-lg text-xs font-bold transition-colors"
              style={{ border: '1px solid rgba(169,180,185,0.3)', color: 'var(--on-surface-variant)' }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--surface-container-low)' }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent' }}
            >
              Audit Full History
            </button>
          </div>
        </div>
      </div>

      {/* FAB */}
      <button
        className="fixed bottom-8 right-8 w-14 h-14 rounded-full flex items-center justify-center text-white shadow-2xl transition-transform hover:scale-110 z-50"
        style={{ background: 'var(--inverse-surface)' }}
      >
        <span className="material-symbols-outlined text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>bolt</span>
      </button>
    </div>
  )
}
