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
  Mail,
  ChevronRight,
  Inbox
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { getInboxStats } from "@/lib/api"

const navItems = [
  {
    title: "Dashboard",
    href: "/",
    icon: LayoutDashboard,
  },
  {
    title: "Audiences",
    href: "/audiences",
    icon: Users,
  },
  {
    title: "Templates",
    href: "/templates",
    icon: FileCode2,
  },
  {
    title: "Campaigns",
    href: "/campaigns",
    icon: Send,
  },
  {
    title: "Inbox",
    href: "/inbox",
    icon: Inbox,
  },
]

export default function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    // Load unread count on mount and refresh every 60 seconds
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

  return (
    <aside className="w-64 border-r bg-card/50 backdrop-blur-sm flex flex-col fixed inset-y-0 left-0 z-30">
      {/* Brand Header */}
      <div className="h-16 border-b flex items-center px-6 gap-3">
        <div className="h-9 w-9 rounded-lg bg-primary text-primary-foreground flex items-center justify-center font-bold shadow-sm">
          <Mail className="h-5 w-5" />
        </div>
        <div>
          <h2 className="font-semibold text-sm leading-none">MailPlatform</h2>
          <span className="text-[11px] text-muted-foreground">Self-Hosted SES</span>
        </div>
      </div>

      {/* Navigation Links */}
      <div className="flex-1 py-6 px-3 space-y-1 overflow-y-auto">
        <div className="px-3 pb-2 text-[11px] font-semibold text-muted-foreground tracking-wider uppercase">
          Menu
        </div>
        {navItems.map((item) => {
          const isActive = item.href === "/" 
            ? pathname === "/" 
            : pathname.startsWith(item.href)
          const Icon = item.icon
          const isInbox = item.href === "/inbox"

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all group",
                isActive
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/70"
              )}
            >
              <Icon className={cn("h-4 w-4 shrink-0 transition-transform group-hover:scale-105", isActive ? "text-primary-foreground" : "text-muted-foreground")} />
              <span className="flex-1">{item.title}</span>
              {isInbox && unreadCount > 0 && !isActive && (
                <span className="ml-auto inline-flex items-center justify-center h-5 min-w-5 px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-bold">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
              {isActive && <ChevronRight className="h-4 w-4 opacity-70" />}
            </Link>
          )
        })}
      </div>

      {/* Bottom Footer */}
      <div className="p-4 border-t bg-muted/20">
        <Button
          variant="outline"
          size="sm"
          className="w-full justify-start gap-2 text-muted-foreground hover:text-destructive hover:border-destructive/30"
          onClick={handleLogout}
        >
          <LogOut className="h-4 w-4" />
          <span>Sign Out</span>
        </Button>
      </div>
    </aside>
  )
}

