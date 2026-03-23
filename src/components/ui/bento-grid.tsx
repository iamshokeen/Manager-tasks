// src/components/ui/bento-grid.tsx
import { ReactNode } from 'react'
import { cn } from '@/lib/utils'

export const BentoGrid = ({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) => (
  <div className={cn('grid w-full auto-rows-[18rem] grid-cols-3 gap-4', className)}>
    {children}
  </div>
)

export const BentoCard = ({
  name,
  className,
  background,
  Icon,
  description,
  href,
  cta,
}: {
  name: string
  className: string
  background: ReactNode
  Icon: React.ElementType
  description: string
  href: string
  cta: string
}) => (
  <div
    className={cn(
      'group relative col-span-3 flex flex-col justify-between overflow-hidden rounded-xl',
      'bg-white shadow-[0_20px_40px_rgba(0,74,198,0.06)] hover:-translate-y-0.5 transition-all cursor-pointer',
      className
    )}
  >
    <div>{background}</div>
    <div className="pointer-events-none z-10 flex transform-gpu flex-col gap-1 p-5 transition-all duration-300 group-hover:-translate-y-8">
      <div className="w-10 h-10 rounded-lg bg-primary/5 flex items-center justify-center mb-3">
        <Icon className="h-5 w-5 text-primary transition-all duration-300 group-hover:scale-75" />
      </div>
      <h3 className="font-semibold text-foreground text-sm">{name}</h3>
      <p className="text-xs text-[var(--outline)]">{description}</p>
    </div>
    <div className="pointer-events-none absolute bottom-0 flex w-full translate-y-8 transform-gpu flex-row items-center p-4 opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100">
      <a
        href={href}
        className="pointer-events-auto text-xs text-primary hover:underline"
      >
        {cta} →
      </a>
    </div>
  </div>
)
