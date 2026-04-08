const DEPT_STYLES: Record<string, React.CSSProperties> = {
  Analytics:             { background: 'rgba(124,58,237,0.1)',  color: '#5b21b6' },
  Revenue:               { background: 'var(--tertiary-container)', color: 'var(--on-tertiary-container)' },
  OTA:                   { background: 'var(--primary-container)', color: 'var(--on-primary-container)' },
  Marketing:             { background: 'rgba(225,29,72,0.1)',   color: '#9f1239' },
  'Financial Modelling': { background: 'rgba(5,150,105,0.1)',   color: '#065f46' },
  'Program Management':  { background: 'rgba(234,88,12,0.1)',   color: '#7c2d12' },
}

export function DepartmentBadge({ department, className }: { department: string; className?: string }) {
  const style = DEPT_STYLES[department] ?? {
    background: 'var(--surface-container-high)',
    color: 'var(--on-surface-variant)',
  }
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide${className ? ' ' + className : ''}`}
      style={style}
    >
      {department}
    </span>
  )
}
