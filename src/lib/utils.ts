import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

import { format, formatDistanceToNow, isBefore, startOfDay } from 'date-fns'
import { toZonedTime } from 'date-fns-tz'

const IST = 'Asia/Kolkata'

export function toIST(date: Date): Date {
  return toZonedTime(date, IST)
}

export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return format(toIST(d), 'dd MMM yyyy')
}

export function formatDateTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return format(toIST(d), 'dd MMM yyyy, h:mm a')
}

export function formatRelative(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return formatDistanceToNow(d, { addSuffix: true })
}

export function isOverdue(dueDate: Date | string | null): boolean {
  if (!dueDate) return false
  const d = typeof dueDate === 'string' ? new Date(dueDate) : dueDate
  return isBefore(startOfDay(toIST(d)), startOfDay(toIST(new Date())))
}

export function isDueToday(dueDate: Date | string | null): boolean {
  if (!dueDate) return false
  const d = typeof dueDate === 'string' ? new Date(dueDate) : dueDate
  return format(toIST(d), 'yyyy-MM-dd') === format(toIST(new Date()), 'yyyy-MM-dd')
}

export function isDueSoon(dueDate: Date | string | null, hours = 24): boolean {
  if (!dueDate) return false
  const d = typeof dueDate === 'string' ? new Date(dueDate) : dueDate
  const cutoff = new Date(Date.now() + hours * 3600 * 1000)
  return d > new Date() && d < cutoff
}

export const PRIORITY_COLORS: Record<string, string> = {
  critical: 'text-critical',
  high: 'text-high',
  medium: 'text-medium-status',
  low: 'text-low',
}

export const STATUS_LABELS: Record<string, string> = {
  todo: 'To Do',
  in_progress: 'In Progress',
  review: 'Review',
  blocked: 'Blocked',
  done: 'Done',
}

export const DEPARTMENTS = [
  'Analytics',
  'Revenue',
  'OTA',
  'Marketing',
  'Financial Modelling',
  'Program Management',
] as const

export const PROJECT_STAGES = ['planning', 'active', 'review', 'closed'] as const
export const TASK_STATUSES = ['todo', 'in_progress', 'review', 'blocked', 'done'] as const
export const PRIORITIES = ['critical', 'high', 'medium', 'low'] as const
export const DELEGATION_LEVELS = { 1: 'Do', 2: 'Research', 3: 'Decide', 4: 'Own' } as const
