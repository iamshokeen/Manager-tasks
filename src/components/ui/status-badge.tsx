const CONFIG: Record<string, { label: string; bg: string; color: string }> = {
  todo:        { label: 'To Do',       bg: 'var(--surface-container-high)',   color: 'var(--outline)' },
  in_progress: { label: 'In Progress', bg: 'var(--primary-container)',        color: 'var(--on-primary-container)' },
  review:      { label: 'Review',      bg: 'var(--tertiary-container)',        color: 'var(--on-tertiary-container)' },
  done:        { label: 'Done',        bg: 'rgba(5,150,105,0.12)',            color: '#065f46' },
  blocked:     { label: 'Blocked',     bg: 'var(--error-container)',          color: 'var(--on-error-container)' },
}

export function StatusBadge({ status }: { status: string }) {
  const config = CONFIG[status] ?? CONFIG.todo
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase"
      style={{ background: config.bg, color: config.color }}
    >
      {config.label}
    </span>
  )
}
