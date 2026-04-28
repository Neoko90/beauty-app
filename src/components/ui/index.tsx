import { cn } from '@/lib/utils'

// ── Badge ────────────────────────────────────────────────────
interface BadgeProps {
  children: React.ReactNode
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'purple'
  className?: string
}

export function Badge({ children, variant = 'default', className }: BadgeProps) {
  const variants = {
    default: 'bg-gray-100 text-gray-700',
    success: 'bg-green-100 text-green-800',
    warning: 'bg-yellow-100 text-yellow-800',
    danger: 'bg-red-100 text-red-800',
    info: 'bg-blue-100 text-blue-800',
    purple: 'bg-violet-100 text-violet-800',
  }
  return (
    <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium', variants[variant], className)}>
      {children}
    </span>
  )
}

// ── Card ─────────────────────────────────────────────────────
interface CardProps {
  children: React.ReactNode
  className?: string
  padding?: boolean
}

export function Card({ children, className, padding = true }: CardProps) {
  return (
    <div className={cn('bg-white rounded-2xl border border-gray-100 shadow-sm', padding && 'p-5', className)}>
      {children}
    </div>
  )
}

// ── KPI Card ──────────────────────────────────────────────────
interface KpiCardProps {
  title: string
  value: string | number
  change?: number
  icon?: React.ReactNode
  iconBg?: string
}

export function KpiCard({ title, value, change, icon, iconBg = 'bg-violet-50' }: KpiCardProps) {
  const isPositive = (change ?? 0) >= 0
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      <div className="flex items-start justify-between mb-3">
        <div className={cn('p-2.5 rounded-xl', iconBg)}>
          {icon}
        </div>
        {change !== undefined && (
          <span className={cn('text-xs font-medium px-1.5 py-0.5 rounded-full',
            isPositive ? 'text-green-700 bg-green-50' : 'text-red-600 bg-red-50')}>
            {isPositive ? '+' : ''}{change}%
          </span>
        )}
      </div>
      <div className="text-2xl font-bold text-gray-900">{value}</div>
      <div className="text-sm text-gray-500 mt-0.5">{title}</div>
    </div>
  )
}

// ── Avatar ────────────────────────────────────────────────────
interface AvatarProps {
  name: string
  color?: string
  photo?: string
  size?: 'sm' | 'md' | 'lg'
}

export function Avatar({ name, color = '#7C3AED', photo, size = 'md' }: AvatarProps) {
  const initials = name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()
  const sizes = { sm: 'w-7 h-7 text-xs', md: 'w-9 h-9 text-sm', lg: 'w-12 h-12 text-base' }

  if (photo) {
    return <img src={photo} alt={name} className={cn('rounded-full object-cover', sizes[size])} />
  }

  return (
    <div
      className={cn('rounded-full flex items-center justify-center font-semibold text-white flex-shrink-0', sizes[size])}
      style={{ backgroundColor: color }}
    >
      {initials}
    </div>
  )
}

// ── Empty State ────────────────────────────────────────────────
interface EmptyStateProps {
  icon?: React.ReactNode
  title: string
  description?: string
  action?: React.ReactNode
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      {icon && <div className="text-gray-300 mb-4">{icon}</div>}
      <h3 className="text-gray-700 font-medium mb-1">{title}</h3>
      {description && <p className="text-gray-400 text-sm mb-4 max-w-xs">{description}</p>}
      {action}
    </div>
  )
}

// ── Spinner ────────────────────────────────────────────────────
export function Spinner({ className }: { className?: string }) {
  return (
    <div className={cn('animate-spin rounded-full border-2 border-gray-200 border-t-violet-600 w-5 h-5', className)} />
  )
}

// ── Divider ───────────────────────────────────────────────────
export function Divider({ className }: { className?: string }) {
  return <hr className={cn('border-gray-100', className)} />
}

// ── Toggle ────────────────────────────────────────────────────
interface ToggleProps {
  checked: boolean
  onChange: (v: boolean) => void
  label?: string
  disabled?: boolean
}

export function Toggle({ checked, onChange, label, disabled }: ToggleProps) {
  return (
    <label className={cn('flex items-center gap-3 cursor-pointer', disabled && 'opacity-50 cursor-not-allowed')}>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => !disabled && onChange(!checked)}
        className={cn(
          'relative w-10 h-5 rounded-full transition-colors flex-shrink-0',
          checked ? 'bg-violet-600' : 'bg-gray-200'
        )}
      >
        <span className={cn(
          'absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform',
          checked ? 'translate-x-5' : 'translate-x-0'
        )} />
      </button>
      {label && <span className="text-sm text-gray-700">{label}</span>}
    </label>
  )
}
