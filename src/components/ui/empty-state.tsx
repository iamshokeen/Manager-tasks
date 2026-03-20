import { cn } from '@/lib/utils'

export function EmptyState({ icon, title, description, action }: {
  icon?: React.ReactNode
  title: string
  description?: string
  action?: React.ReactNode
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      {icon && <div className="text-muted-foreground mb-4 opacity-40">{icon}</div>}
      <div className="text-sm font-medium text-foreground mb-1">{title}</div>
      {description && <div className="text-xs text-muted-foreground mb-4">{description}</div>}
      {action}
    </div>
  )
}
