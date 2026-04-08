'use client'

import React, { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { ShieldCheck, RotateCcw, Save } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/ui/page-header'

// ─── Constants ────────────────────────────────────────────────────────────────

const ROLES = ['SUPER_ADMIN', 'MANAGER', 'SENIOR_IC', 'DIRECT_REPORT', 'EXEC_VIEWER', 'GUEST'] as const
type Role = typeof ROLES[number]

const RESOURCE_LABELS: Record<string, string> = {
  tasks: 'Tasks',
  one_on_ones: '1:1s',
  stakeholder_crm: 'The Table (Stakeholders)',
  team_pulse: 'Your People & Rounds',
  revenue: 'Revenue',
  users: 'Users',
  admin: 'Admin Panel',
}

const ACTION_LABELS: Record<string, string> = {
  view: 'View',
  create: 'Create',
  edit: 'Edit',
  delete: 'Delete',
}

const ROLE_LABELS: Record<Role, string> = {
  SUPER_ADMIN: 'Super Admin',
  MANAGER: 'Manager',
  SENIOR_IC: 'Senior IC',
  DIRECT_REPORT: 'Direct Report',
  EXEC_VIEWER: 'Exec Viewer',
  GUEST: 'Guest',
}

type Rules = Record<string, Record<string, Role[]>>

// ─── Component ────────────────────────────────────────────────────────────────

export default function RBACPage() {
  const [rules, setRules] = useState<Rules | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetch('/api/admin/rbac')
      .then(r => r.json())
      .then(r => { setRules(r.data); setLoading(false) })
      .catch(() => { toast.error('Failed to load rules'); setLoading(false) })
  }, [])

  function toggle(resource: string, action: string, role: Role) {
    if (role === 'SUPER_ADMIN') return // always locked
    setRules(prev => {
      if (!prev) return prev
      const current: Role[] = prev[resource]?.[action] ?? []
      const next = current.includes(role)
        ? current.filter(r => r !== role)
        : [...current, role]
      return {
        ...prev,
        [resource]: { ...prev[resource], [action]: next },
      }
    })
  }

  async function save() {
    if (!rules) return
    setSaving(true)
    try {
      const res = await fetch('/api/admin/rbac', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(rules),
      })
      if (!res.ok) throw new Error()
      toast.success('Permissions saved')
    } catch {
      toast.error('Failed to save')
    } finally {
      setSaving(false)
    }
  }

  async function reset() {
    setLoading(true)
    try {
      // Delete DB overrides by posting empty rules — server merges with defaults
      await fetch('/api/admin/rbac', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      const res = await fetch('/api/admin/rbac')
      const data = await res.json()
      setRules(data.data)
      toast.success('Reset to defaults')
    } catch {
      toast.error('Failed to reset')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground text-sm">
        Loading permissions…
      </div>
    )
  }

  if (!rules) return null

  const resources = Object.keys(RESOURCE_LABELS)

  return (
    <div className="flex flex-col">
      <PageHeader
        title="Permissions"
        description="Control what each role can see and do. SUPER_ADMIN always has full access."
        action={
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={reset} disabled={saving}>
              <RotateCcw className="h-4 w-4 mr-1" />
              Reset defaults
            </Button>
            <Button size="sm" onClick={save} disabled={saving}>
              <Save className="h-4 w-4 mr-1" />
              {saving ? 'Saving…' : 'Save'}
            </Button>
          </div>
        }
      />

      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-[var(--surface-container-low)]">
              <th className="text-left px-4 py-3 text-muted-foreground font-medium w-48">Resource</th>
              <th className="text-left px-4 py-3 text-muted-foreground font-medium w-24">Action</th>
              {ROLES.map(role => (
                <th key={role} className="px-3 py-3 text-center text-muted-foreground font-medium min-w-[90px]">
                  <span className="text-xs">{ROLE_LABELS[role]}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {resources.map((resource, rIdx) => {
              const actions = Object.keys(rules[resource] ?? {})
              return actions.map((action, aIdx) => (
                <tr
                  key={`${resource}-${action}`}
                  className={`border-b border-border/50 transition-colors hover:bg-[var(--surface-container)] ${
                    aIdx === 0 && rIdx > 0 ? 'border-t border-border' : ''
                  }`}
                >
                  {aIdx === 0 ? (
                    <td
                      className="px-4 py-2.5 font-medium text-foreground align-top pt-3"
                      rowSpan={actions.length}
                    >
                      <div className="flex items-center gap-2">
                        <ShieldCheck className="h-3.5 w-3.5 text-primary shrink-0" />
                        {RESOURCE_LABELS[resource] ?? resource}
                      </div>
                    </td>
                  ) : null}
                  <td className="px-4 py-2.5 text-muted-foreground">
                    {ACTION_LABELS[action] ?? action}
                  </td>
                  {ROLES.map(role => {
                    const checked = (rules[resource]?.[action] ?? []).includes(role)
                    const locked = role === 'SUPER_ADMIN'
                    return (
                      <td key={role} className="px-3 py-2.5 text-center">
                        <input
                          type="checkbox"
                          checked={checked}
                          disabled={locked}
                          onChange={() => toggle(resource, action, role)}
                          className={`h-4 w-4 rounded border-border accent-primary cursor-pointer ${
                            locked ? 'opacity-40 cursor-not-allowed' : ''
                          }`}
                        />
                      </td>
                    )
                  })}
                </tr>
              ))
            })}
          </tbody>
        </table>
      </div>

      <p className="mt-4 text-xs text-muted-foreground">
        Changes apply immediately after saving. SUPER_ADMIN permissions cannot be removed.
      </p>
    </div>
  )
}
