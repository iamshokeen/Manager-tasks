export default function OfflinePage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background text-foreground p-8">
      <div className="max-w-md text-center space-y-4">
        <div className="text-4xl font-bold" style={{ color: 'var(--color-gold)' }}>
          Lohono CMD
        </div>
        <h1 className="text-xl font-semibold">You&apos;re offline</h1>
        <p className="text-muted-foreground text-sm">
          No internet connection. Data shown in other pages reflects your last sync.
          Return when connected to get the latest updates.
        </p>
        <div className="text-xs font-mono text-muted-foreground pt-4 border-t border-border">
          FY27 · Lohono Stays
        </div>
      </div>
    </div>
  )
}
