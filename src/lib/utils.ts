import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format, formatDistanceToNow, isToday, isTomorrow } from 'date-fns'
import { pl } from 'date-fns/locale'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: string | Date, fmt = 'dd.MM.yyyy') {
  return format(new Date(date), fmt, { locale: pl })
}

export function formatDateTime(date: string | Date) {
  return format(new Date(date), 'dd.MM.yyyy HH:mm', { locale: pl })
}

export function formatTime(date: string | Date) {
  return format(new Date(date), 'HH:mm', { locale: pl })
}

export function formatCurrency(amount: number) {
  return new Intl.NumberFormat('pl-PL', { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(amount) + ' zł'
}

export function formatRelative(date: string | Date) {
  const d = new Date(date)
  if (isToday(d)) return 'Dziś'
  if (isTomorrow(d)) return 'Jutro'
  return formatDistanceToNow(d, { locale: pl, addSuffix: true })
}

export function slugify(text: string) {
  return text
    .toLowerCase()
    .replace(/[ąćęłńóśźż]/g, c => ({ ą:'a',ć:'c',ę:'e',ł:'l',ń:'n',ó:'o',ś:'s',ź:'z',ż:'z' }[c] || c))
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function generateReferralCode(name: string) {
  const base = name.substring(0, 3).toUpperCase().replace(/[^A-Z]/g, 'X')
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase()
  return `${base}${rand}`
}

export function getInitials(name: string) {
  return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()
}

export function addMinutes(date: Date, minutes: number) {
  return new Date(date.getTime() + minutes * 60 * 1000)
}

export function minutesToHHMM(minutes: number) {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (h === 0) return `${m} min`
  if (m === 0) return `${h} godz.`
  return `${h} godz. ${m} min`
}

export function parseSmsTemplate(template: string, vars: Record<string, string>) {
  return template.replace(/\{(\w+)\}/g, (_, key) => vars[key] || `{${key}}`)
}

export function getStatusColor(status: string) {
  const colors: Record<string, string> = {
    confirmed: 'bg-green-100 text-green-800',
    pending: 'bg-yellow-100 text-yellow-800',
    awaiting_deposit: 'bg-blue-100 text-blue-800',
    done: 'bg-gray-100 text-gray-700',
    cancelled: 'bg-red-100 text-red-800',
    no_show: 'bg-red-200 text-red-900',
  }
  return colors[status] || 'bg-gray-100 text-gray-700'
}

export function getPlanBadgeColor(plan: string) {
  const colors: Record<string, string> = {
    trial: 'bg-gray-100 text-gray-700',
    solo: 'bg-green-100 text-green-800',
    grow: 'bg-yellow-100 text-yellow-800',
    pro: 'bg-red-100 text-red-800',
    max: 'bg-purple-100 text-purple-800',
  }
  return colors[plan] || 'bg-gray-100 text-gray-700'
}

export function isSalonOnTrial(salon: { plan: string; trial_ends_at?: string }) {
  if (salon.plan !== 'trial') return false
  if (!salon.trial_ends_at) return false
  return new Date(salon.trial_ends_at) > new Date()
}

export function daysLeftInTrial(trial_ends_at: string) {
  const diff = new Date(trial_ends_at).getTime() - new Date().getTime()
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}
