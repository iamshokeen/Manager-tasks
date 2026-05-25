'use client'

// On-page print toolbar for the /reports/print/[userId] page. Lives outside
// the server-rendered tree so onClick handlers actually wire up. Hidden in
// the actual printed PDF via the .no-print class.
export function PrintActions() {
  return (
    <div className="no-print" style={{
      display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'flex-end',
      marginBottom: 16,
    }}>
      <button
        onClick={() => { try { window.print() } catch { /* noop */ } }}
        style={{
          padding: '8px 14px', borderRadius: 4, border: 'none',
          background: '#0053db', color: '#fff', fontSize: 12, fontWeight: 700,
          letterSpacing: '0.06em', textTransform: 'uppercase', cursor: 'pointer',
        }}
      >Download PDF</button>
      <button
        onClick={() => window.close()}
        style={{
          padding: '8px 14px', borderRadius: 4,
          border: '1px solid #d0d0d0', background: '#fff', color: '#555',
          fontSize: 12, fontWeight: 700,
          letterSpacing: '0.06em', textTransform: 'uppercase', cursor: 'pointer',
        }}
      >Close</button>
    </div>
  )
}
