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

const ROLE_SUBTITLES: Record<Role, string> = {
  SUPER_ADMIN: 'Full Root Access',
  MANAGER: 'Team Control',
  SENIOR_IC: 'Advanced User',
  DIRECT_REPORT: 'Standard User',
  EXEC_VIEWER: 'Read Only',
  GUEST: 'Restricted',
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
    if (role === 'SUPER_ADMIN') return
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
      <div className="flex items-center justify-center py-20 text-sm" style={{ color: 'var(--on-surface-variant)' }}>
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

      {/* Breadcrumb / label */}
      <div className="flex items-center gap-2 mb-4">
        <ShieldCheck className="h-4 w-4" style={{ color: 'var(--primary)' }} />
        <span
          className="text-[10px] font-bold uppercase tracking-widest"
          style={{ color: 'var(--primary)' }}
        >
          System Governance
        </span>
      </div>

      {/* Matrix container */}
      <div
        className="rounded-xl overflow-hidden border flex flex-col"
        style={{
          background: 'var(--surface-container-lowest)',
          borderColor: 'var(--surface-container-highest, #d9e4ea)',
          boxShadow: '0 8px 30px rgba(42,52,57,0.04)',
        }}
      >
        <div className="overflow-auto">
          <table className="w-full border-collapse text-left" style={{ minWidth: '900px' }}>
            <thead>
              <tr style={{ background: 'var(--surface-container-lowest)' }}>
                {/* Resource + Action col */}
                <th
                  className="p-4 border-b"
                  style={{ borderColor: 'var(--surface-container-highest, #d9e4ea)', width: '220px' }}
                >
                  <span
                    className="text-[10px] font-bold uppercase tracking-widest"
                    style={{ color: 'var(--on-surface-variant)' }}
                  >
                    Resource &amp; Action
                  </span>
                </th>

                {/* Role columns */}
                {ROLES.map(role => (
                  <th
                    key={role}
                    className="p-4 border-b text-center"
                    style={{
                      borderColor: 'var(--surface-container-highest, #d9e4ea)',
                      minWidth: '110px',
                      background: role === 'SUPER_ADMIN'
                        ? 'rgba(0,83,219,0.06)'
                        : 'var(--surface-container-lowest)',
                    }}
                  >
                    <div
                      className="text-xs font-black"
                      style={{ color: role === 'SUPER_ADMIN' ? 'var(--on-primary-container, #0048bf)' : 'var(--on-surface)' }}
                    >
                      {ROLE_LABELS[role]}
                    </div>
                    <div
                      className="text-[9px] font-semibold mt-1"
                      style={{ color: role === 'SUPER_ADMIN' ? 'rgba(0,83,219,0.5)' : 'var(--on-surface-variant)' }}
                    >
                      {ROLE_SUBTITLES[role]}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {resources.map((resource) => {
                const actions = Object.keys(rules[resource] ?? {})
                return (
                  <React.Fragment key={resource}>
                    {/* Resource group header row */}
                    <tr style={{ background: 'rgba(240,244,247,0.5)' }}>
                      <td
                        className="px-4 py-2 border-y"
                        style={{ borderColor: 'var(--surface-container-highest, #d9e4ea)' }}
                        colSpan={ROLES.length + 1}
                      >
                        <div
                          className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest"
                          style={{ color: 'var(--on-surface-variant)' }}
                        >
                          <ShieldCheck className="h-3.5 w-3.5" style={{ color: 'var(--primary)' }} />
                          Resource: {RESOURCE_LABELS[resource] ?? resource}
                        </div>
                      </td>
                    </tr>

                    {/* Action rows */}
                    {actions.map((action) => (
                      <tr
                        key={`${resource}-${action}`}
                        className="transition-colors group"
                        style={{ borderBottom: `1px solid rgba(232,239,243,0.6)` }}
                        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--surface-container-low)' }}
                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = '' }}
                      >
                        <td
                          className="px-6 py-3 text-sm font-medium"
                          style={{ color: 'var(--on-surface)' }}
                        >
                          {ACTION_LABELS[action] ?? action}
                        </td>

                        {ROLES.map(role => {
                          const checked = (rules[resource]?.[action] ?? []).includes(role)
                          const locked = role === 'SUPER_ADMIN'
                          return (
                            <td
                              key={role}
                              className="px-4 py-3 text-center"
                              style={{
                                background: locked ? 'rgba(0,83,219,0.04)' : undefined,
                              }}
                            >
                              <input
                                type="checkbox"
                                checked={checked}
                                disabled={locked}
                                onChange={() => toggle(resource, action, role)}
                                className={`h-4 w-4 rounded accent-primary border-outline-variant ${
                                  locked ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer focus:ring-primary'
                                }`}
                              />
                            </td>
                          )
                        })}
                      </tr>
                    ))}
                  </React.Fragment>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      <p className="mt-4 text-xs" style={{ color: 'var(--on-surface-variant)' }}>
        Changes apply immediately after saving. SUPER_ADMIN permissions cannot be removed.
      </p>
    </div>
  )
}
