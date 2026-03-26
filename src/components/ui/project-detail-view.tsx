'use client'

import React from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Edit, Share2, Calendar, User, Building2, Tag } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { MemberAvatar } from '@/components/ui/member-avatar'
import { DepartmentBadge } from '@/components/ui/department-badge'
import { StatusBadge } from '@/components/ui/status-badge'
import { PriorityBadge } from '@/components/ui/priority-badge'
import { formatDate } from '@/lib/utils'
import { cn } from '@/lib/utils'

interface ProjectDetailViewProps {
  project: {
    id: string
    title: string
    description?: string | null
    stage: string
    department: string
    dueDate?: string | null
    owner?: { id: string; name: string } | null
    stakeholder?: { id: string; name: string } | null
    tasks: Array<{
      id: string
      title: string
      status: string
      priority: string
      dueDate?: string | null
      assignee?: { name: string } | null
    }>
    createdAt: string
  }
  onEdit?: () => void
  onClose?: () => void
}

const STAGE_CONFIG: Record<string, { label: string; className: string }> = {
  planning: {
    label: 'Planning',
    className: 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800',
  },
  active: {
    label: 'Active',
    className: 'bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800',
  },
  review: {
    label: 'Review',
    className: 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800',
  },
  closed: {
    label: 'Closed',
    className: 'bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-800/50 dark:text-gray-400 dark:border-gray-700',
  },
}

const containerVariants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.07,
    },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: 'easeOut' as const } },
}

function StageBadge({ stage }: { stage: string }) {
  const config = STAGE_CONFIG[stage] ?? STAGE_CONFIG.planning
  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 rounded text-xs font-semibold border',
        config.className
      )}
    >
      {config.label}
    </span>
  )
}

export function ProjectDetailView({ project, onEdit }: ProjectDetailViewProps) {
  async function handleShare() {
    const url = `${window.location.origin}/projects/${project.id}`
    try {
      await navigator.clipboard.writeText(url)
      toast.success('Link copied to clipboard')
    } catch {
      toast.error('Failed to copy link')
    }
  }

  return (
    <motion.div
      className="flex flex-col gap-6 w-full"
      initial="hidden"
      animate="visible"
      variants={containerVariants}
    >
      {/* Header bar: breadcrumb + actions */}
      <motion.div
        variants={itemVariants}
        className="flex items-center justify-between gap-4 flex-wrap"
      >
        <nav className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <Link
            href="/projects"
            className="hover:text-foreground transition-colors"
          >
            Projects
          </Link>
          <span>/</span>
          <span className="text-foreground font-medium truncate max-w-[280px]">
            {project.title}
          </span>
        </nav>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleShare}
            className="gap-1.5"
          >
            <Share2 className="h-3.5 w-3.5" />
            Share
          </Button>
          {onEdit && (
            <Button size="sm" onClick={onEdit} className="gap-1.5">
              <Edit className="h-3.5 w-3.5" />
              Edit
            </Button>
          )}
        </div>
      </motion.div>

      {/* Title */}
      <motion.h1
        variants={itemVariants}
        className="text-3xl font-bold text-foreground leading-tight"
      >
        {project.title}
      </motion.h1>

      {/* Meta grid */}
      <motion.div
        variants={itemVariants}
        className="grid grid-cols-2 md:grid-cols-3 gap-4"
      >
        {/* Status */}
        <div className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1">
            <Tag className="h-3 w-3" />
            Status
          </span>
          <StageBadge stage={project.stage} />
        </div>

        {/* Owner */}
        {project.owner && (
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1">
              <User className="h-3 w-3" />
              Owner
            </span>
            <div className="flex items-center gap-1.5">
              <MemberAvatar name={project.owner.name} size="sm" />
              <span className="text-sm text-foreground">{project.owner.name}</span>
            </div>
          </div>
        )}

        {/* Due Date */}
        {project.dueDate && (
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              Due Date
            </span>
            <span className="text-sm text-foreground">{formatDate(project.dueDate)}</span>
          </div>
        )}

        {/* Department */}
        {project.department && (
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1">
              <Building2 className="h-3 w-3" />
              Department
            </span>
            <DepartmentBadge department={project.department} />
          </div>
        )}

        {/* Stakeholder */}
        {project.stakeholder && (
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1">
              <User className="h-3 w-3" />
              Stakeholder
            </span>
            <span className="text-sm text-foreground">{project.stakeholder.name}</span>
          </div>
        )}
      </motion.div>

      {/* Description */}
      <motion.div variants={itemVariants} className="flex flex-col gap-1.5">
        <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider">
          Description
        </h2>
        {project.description ? (
          <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
            {project.description}
          </p>
        ) : (
          <p className="text-sm text-muted-foreground/60 italic">No description provided.</p>
        )}
      </motion.div>

      {/* Tasks table */}
      <motion.div variants={itemVariants} className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider">
          Tasks ({project.tasks.length})
        </h2>

        {project.tasks.length === 0 ? (
          <div className="flex items-center justify-center py-10 border border-dashed border-border rounded-xl text-sm text-muted-foreground">
            No tasks linked to this project yet.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">
                    Task
                  </th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">
                    Status
                  </th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">
                    Priority
                  </th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">
                    Assignee
                  </th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">
                    Due Date
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {project.tasks.map((task) => (
                  <tr
                    key={task.id}
                    className="hover:bg-muted/30 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <Link
                        href={`/tasks/${task.id}`}
                        className="font-medium text-foreground hover:text-primary transition-colors line-clamp-1"
                      >
                        {task.title}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={task.status} />
                    </td>
                    <td className="px-4 py-3">
                      <PriorityBadge priority={task.priority} />
                    </td>
                    <td className="px-4 py-3">
                      {task.assignee ? (
                        <div className="flex items-center gap-1.5">
                          <MemberAvatar name={task.assignee.name} size="sm" />
                          <span className="text-xs text-muted-foreground truncate max-w-[120px]">
                            {task.assignee.name}
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground/50">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs text-muted-foreground">
                        {task.dueDate ? formatDate(task.dueDate) : '—'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </motion.div>
    </motion.div>
  )
}
