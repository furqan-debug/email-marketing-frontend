'use client'

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { 
  LayoutDashboard, 
  Users, 
  FileCode2, 
  Send, 
  LogOut,
  ChevronRight,
  Inbox,
  ShieldAlert,
  UserX,
  Sparkles,
  Zap,
  CheckCircle2,
  Layers
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { getInboxStats } from "@/lib/api"

interface NavGroup {
  label: string
  items: Array<{
    title: string
    href: string
    icon: any
    badge?: number | string
    isInbox?: boolean
  }>
}

export default function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    const load = async () => {
      try {
        const stats = await getInboxStats()
        setUnreadCount(stats.unread ?? 0)
      } catch { /* ignore */ }
    }
    load()
    const interval = setInterval(load, 60000)
    return () => clearInterval(interval)
  }, [])

  async function handleLogout() {
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
      router.push('/login')
    } catch {
      router.push('/login')
    }
  }

  const navGroups: NavGroup[] = [
    {
      label: "Overview",
      items: [
        {
          title: "Dashboard",
          href: "/",
          icon: LayoutDashboard,
        },
        {
          title: "Inbox",
          href: "/inbox",
          icon: Inbox,
          isInbox: true,
        },
      ],
    },
    {
      label: "Campaigns & Content",
      items: [
        {
          title: "Campaigns",
          href: "/campaigns",
          icon: Send,
        },
        {
          title: "Templates",
          href: "/templates",
          icon: FileCode2,
        },
      ],
    },
    {
      label: "Audience & Compliance",
      items: [
        {
          title: "Audiences",
          href: "/audiences",
          icon: Users,
        },
        {
          title: "Suppression List",
          href: "/suppressions",
          icon: ShieldAlert,
        },
        {
          title: "Unsubscribers",
          href: "/unsubscribers",
          icon: UserX,
        },
      ],
    },
  ]

  return (
    <aside className="w-64 border-r border-border/80 bg-card/60 backdrop-blur-md flex flex-col fixed inset-y-0 left-0 z-30 shadow-sm">
      {/* Brand Header */}
      <div className="h-16 border-b border-border/70 flex items-center px-5 justify-between">
        <Link href="/" className="flex items-center gap-3 group">
          <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-primary via-indigo-500 to-purple-500 text-primary-foreground flex items-center justify-center font-bold shadow-md shadow-primary/20 group-hover:scale-105 transition-transform">
            <Zap className="h-5 w-5 fill-current" />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-base tracking-tight text-foreground">SendNova</span>
              <span className="text-[10px] font-semibold uppercase px-1.5 py-0.2 rounded bg-primary/10 text-primary border border-primary/20">
                PRO
              </span>
            </div>
            <span className="text-[11px] text-muted-foreground">Cold Outreach OS</span>
          </div>
        </Link>
      </div>

      {/* SES Status Banner */}
      <div className="px-4 pt-3 pb-1">
        <div className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-medium">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="text-[11px]">SES Dedicated IP Pool</span>
          </div>
          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
        </div>
      </div>

      {/* Navigation Sections */}
      <div className="flex-1 py-3 px-3 space-y-5 overflow-y-auto">
        {navGroups.map((group) => (
          <div key={group.label} className="space-y-1">
            <div className="px-3 pb-1.5 text-[10px] font-bold text-muted-foreground/70 tracking-wider uppercase">
              {group.label}
            </div>
            {group.items.map((item) => {
              const isActive = item.href === "/" 
                ? pathname === "/" 
                : pathname.startsWith(item.href)
              const Icon = item.icon

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all group relative",
                    isActive
                      ? "bg-primary text-primary-foreground shadow-sm shadow-primary/20 font-semibold"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                  )}
                >
                  <Icon className={cn(
                    "h-4 w-4 shrink-0 transition-transform group-hover:scale-110",
                    isActive ? "text-primary-foreground" : "text-muted-foreground group-hover:text-foreground"
                  )} />
                  <span className="flex-1 truncate">{item.title}</span>

                  {item.isInbox && unreadCount > 0 && (
                    <span className={cn(
                      "ml-auto inline-flex items-center justify-center h-5 min-w-5 px-1.5 rounded-full text-[10px] font-bold",
                      isActive 
                        ? "bg-background text-primary" 
                        : "bg-primary text-primary-foreground shadow-sm shadow-primary/30"
                    )}>
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                  )}

                  {isActive && !item.isInbox && (
                    <ChevronRight className="h-4 w-4 opacity-70 ml-auto" />
                  )}
                </Link>
              )
            })}
          </div>
        ))}
      </div>

      {/* User / Logout Footer */}
      <div className="p-3 border-t border-border/70 bg-muted/30">
        <Button
          variant="outline"
          size="sm"
          className="w-full justify-start gap-2 text-xs font-medium text-muted-foreground hover:text-destructive hover:border-destructive/30 hover:bg-destructive/5 transition-colors"
          onClick={handleLogout}
        >
          <LogOut className="h-3.5 w-3.5" />
          <span>Sign Out</span>
        </Button>
      </div>
    </aside>
  )
}

