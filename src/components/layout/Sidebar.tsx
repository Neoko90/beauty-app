'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard, Calendar, Users, Gift, Store, Package,
  TrendingUp, Settings, Zap, CreditCard, LogOut, Star,
  ChevronLeft, ChevronRight, Menu, X, BarChart3
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

const navItems = [
  { href: '/dashboard/pulpit', icon: LayoutDashboard, label: 'Pulpit' },
  { href: '/dashboard/kalendarz', icon: Calendar, label: 'Kalendarz' },
  { href: '/dashboard/klienci', icon: Users, label: 'Klienci' },
  { href: '/dashboard/polecenia', icon: Gift, label: 'Polecenia' },
  { href: '/dashboard/salony-partnerskie', icon: Store, label: 'Salony partnerskie' },
  { href: '/dashboard/magazyn', icon: Package, label: 'Magazyn' },
  { href: '/dashboard/finanse', icon: CreditCard, label: 'Finanse' },
  { href: '/dashboard/statystyki', icon: BarChart3, label: 'Statystyki' },
  { href: '/dashboard/automatyzacje', icon: Zap, label: 'Automatyzacje' },
  { href: '/dashboard/ustawienia', icon: Settings, label: 'Ustawienia' },
]

interface SidebarProps {
  salonName?: string
  salonPlan?: string
  smsBalance?: number
  smsLimit?: number
}

export function Sidebar({ salonName = 'Mój Salon', salonPlan = 'trial', smsBalance = 0, smsLimit = 30 }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const stored = localStorage.getItem('sidebar-collapsed')
    if (stored) setCollapsed(stored === 'true')
  }, [])

  const toggleCollapse = () => {
    const next = !collapsed
    setCollapsed(next)
    localStorage.setItem('sidebar-collapsed', String(next))
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/auth/login')
  }

  const planLabels: Record<string, string> = {
    trial: 'Okres próbny', solo: 'Plan Solo', grow: 'Plan Grow', pro: 'Plan Pro', max: 'Plan Max'
  }
  const planColors: Record<string, string> = {
    trial: 'text-gray-500', solo: 'text-green-600', grow: 'text-yellow-600', pro: 'text-red-500', max: 'text-violet-600'
  }

  const smsPercent = smsLimit > 0 ? Math.round((smsBalance / smsLimit) * 100) : 0

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className={cn('flex items-center gap-3 px-4 py-5', collapsed ? 'justify-center' : '')}>
        <div className="w-8 h-8 bg-violet-600 rounded-xl flex items-center justify-center flex-shrink-0">
          <Star className="w-4 h-4 text-white fill-white" />
        </div>
        {!collapsed && <span className="text-lg font-bold text-gray-900">Referly</span>}
      </div>

      {/* Salon info */}
      {!collapsed && (
        <div className="mx-3 mb-4 px-3 py-2.5 bg-violet-50 rounded-xl">
          <p className="text-sm font-semibold text-gray-900 truncate">{salonName}</p>
          <p className={cn('text-xs font-medium', planColors[salonPlan])}>{planLabels[salonPlan] || salonPlan}</p>
        </div>
      )}
      {collapsed && (
        <div className="mx-3 mb-4 flex justify-center">
          <div className="w-8 h-8 bg-violet-50 rounded-xl flex items-center justify-center">
            <span className="text-xs font-bold text-violet-600">{salonName.charAt(0)}</span>
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 px-3 space-y-0.5 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all',
                isActive
                  ? 'bg-violet-600 text-white font-medium shadow-sm shadow-violet-200'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900',
                collapsed ? 'justify-center' : ''
              )}
              title={collapsed ? item.label : undefined}
            >
              <item.icon className="w-4 h-4 flex-shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          )
        })}
      </nav>

      {/* SMS Usage */}
      {!collapsed && (
        <div className="mx-3 my-3 px-3 py-3 bg-gray-50 rounded-xl">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-medium text-gray-600">SMS tego miesiąca</span>
            <span className="text-xs text-gray-500">{smsBalance} / {smsLimit}</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-1.5">
            <div
              className={cn('h-1.5 rounded-full transition-all', smsPercent > 80 ? 'bg-red-500' : 'bg-violet-500')}
              style={{ width: `${Math.min(smsPercent, 100)}%` }}
            />
          </div>
          <p className="text-xs text-gray-400 mt-1">{smsBalance} użytych</p>
        </div>
      )}

      {/* Bottom actions */}
      <div className="px-3 pb-4 space-y-0.5">
        <button
          onClick={handleLogout}
          className={cn(
            'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-gray-500 hover:bg-red-50 hover:text-red-600 transition-all',
            collapsed ? 'justify-center' : ''
          )}
          title={collapsed ? 'Wyloguj' : undefined}
        >
          <LogOut className="w-4 h-4 flex-shrink-0" />
          {!collapsed && <span>Wyloguj</span>}
        </button>

        {/* Collapse toggle (desktop) */}
        <button
          onClick={toggleCollapse}
          className={cn(
            'w-full hidden lg:flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-gray-400 hover:bg-gray-100 transition-all',
            collapsed ? 'justify-center' : ''
          )}
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          {!collapsed && <span>Zwiń panel</span>}
        </button>
      </div>
    </div>
  )

  return (
    <>
      {/* Mobile toggle button */}
      <button
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-white rounded-xl shadow-md border border-gray-100"
        onClick={() => setMobileOpen(true)}
      >
        <Menu className="w-5 h-5 text-gray-700" />
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/30" onClick={() => setMobileOpen(false)} />
          <div className="absolute left-0 top-0 bottom-0 w-64 bg-white shadow-xl">
            <button
              className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-gray-100"
              onClick={() => setMobileOpen(false)}
            >
              <X className="w-4 h-4 text-gray-500" />
            </button>
            <SidebarContent />
          </div>
        </div>
      )}

      {/* Desktop sidebar */}
      <aside className={cn(
        'hidden lg:flex flex-col fixed left-0 top-0 bottom-0 bg-white border-r border-gray-100 z-30 transition-all duration-300',
        collapsed ? 'w-16' : 'w-60'
      )}>
        <SidebarContent />
      </aside>
    </>
  )
}
