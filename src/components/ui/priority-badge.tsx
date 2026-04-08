const CONFIG = {
  critical: {
    label: 'Urgent',
    bg: 'var(--error-container)',
    color: 'var(--on-error-container)',
  },
  high: {
    label: 'High',
    bg: 'var(--tertiary-container)',
    color: 'var(--on-tertiary-container)',
  },
  medium: {
    label: 'Med',
    bg: 'var(--primary-container)',
    color: 'var(--on-primary-container)',
  },
  low: {
    label: 'Low',
    bg: 'var(--surface-container-highest)',
    color: 'var(--on-surface-variant)',
  },
}

export function PriorityBadge({ priority }: { priority: string }) {
  const config = CONFIG[priority as keyof typeof CONFIG] ?? CONFIG.medium
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase"
      style={{ background: config.bg, color: config.color }}
    >
      {config.label}
    </span>
  )
}
