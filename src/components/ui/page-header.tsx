export function PageHeader({ title, description, action }: {
  title: string
  description?: string
  action?: React.ReactNode
}) {
  // On phones the action area often holds a couple of buttons that don't
  // fit alongside a 30px title — so stack vertically below sm, and let the
  // action row wrap and become scrollable if it overflows.
  return (
    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-4 sm:mb-6">
      <div className="min-w-0">
        <h1
          className="font-headline text-2xl sm:text-3xl font-extrabold tracking-tight truncate"
          style={{ color: 'var(--on-surface)' }}
        >
          {title}
        </h1>
        {description && (
          <p className="text-xs sm:text-sm mt-1" style={{ color: 'var(--on-surface-variant)' }}>{description}</p>
        )}
      </div>
      {action && (
        <div className="flex flex-wrap items-center gap-2 -mx-1 px-1 overflow-x-auto sm:overflow-visible">
          {action}
        </div>
      )}
    </div>
  )
}
