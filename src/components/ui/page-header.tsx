export function PageHeader({ title, description, action }: {
  title: string
  description?: string
  action?: React.ReactNode
}) {
  return (
    <div className="flex items-start justify-between mb-6">
      <div>
        <h1 className="font-headline text-3xl font-extrabold tracking-tight" style={{ color: 'var(--on-surface)' }}>
          {title}
        </h1>
        {description && (
          <p className="text-sm mt-1" style={{ color: 'var(--on-surface-variant)' }}>{description}</p>
        )}
      </div>
      {action && <div>{action}</div>}
    </div>
  )
}
