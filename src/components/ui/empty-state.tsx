export function EmptyState({ icon, title, description, action }: {
  icon?: React.ReactNode
  title: string
  description?: string
  action?: React.ReactNode
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      {icon && (
        <div className="mb-4 opacity-30" style={{ color: 'var(--on-surface-variant)' }}>{icon}</div>
      )}
      <div className="text-sm font-semibold mb-1" style={{ color: 'var(--on-surface)' }}>{title}</div>
      {description && (
        <div className="text-xs mb-4" style={{ color: 'var(--on-surface-variant)' }}>{description}</div>
      )}
      {action}
    </div>
  )
}
