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
  Inbox,
  ShieldAlert,
  Zap,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { getInboxStats } from "@/lib/api"

const NAV: Array<{
  section: string
  items: Array<{ title: string; href: string; icon: any; isInbox?: boolean }>
}> = [
  {
    section: "",
    items: [
      { title: "Dashboard", href: "/", icon: LayoutDashboard },
      { title: "Inbox",     href: "/inbox", icon: Inbox, isInbox: true },
    ],
  },
  {
    section: "Outreach",
    items: [
      { title: "Campaigns", href: "/campaigns", icon: Send },
      { title: "Templates", href: "/templates", icon: FileCode2 },
    ],
  },
  {
    section: "Contacts",
    items: [
      { title: "Audiences",   href: "/audiences",  icon: Users },
      { title: "Compliance",  href: "/compliance", icon: ShieldAlert },
    ],
  },
]

export default function Sidebar() {
  const pathname = usePathname()
  const router   = useRouter()
  const [unread, setUnread] = useState(0)

  useEffect(() => {
    const load = async () => {
      try { setUnread((await getInboxStats()).unread ?? 0) } catch {}
    }
    load()
    const t = setInterval(load, 60_000)
    return () => clearInterval(t)
  }, [])

  async function handleLogout() {
    try { await fetch('/api/auth/logout', { method: 'POST' }) } catch {}
    router.push('/login')
  }

  return (
    <aside className="w-[220px] border-r border-border bg-background flex flex-col fixed inset-y-0 left-0 z-30">
      {/* Brand */}
      <div className="h-14 border-b border-border flex items-center px-4">
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="h-7 w-7 rounded-lg bg-primary text-primary-foreground flex items-center justify-center">
            <Zap className="h-4 w-4 fill-current" />
          </div>
          <span className="font-semibold text-sm tracking-tight">SendNova</span>
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-4">
        {NAV.map((group) => (
          <div key={group.section} className="space-y-0.5">
            {group.section && (
              <div className="px-2 pb-1 pt-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
                {group.section}
              </div>
            )}
            {group.items.map((item) => {
              const active = item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href)
              const Icon = item.icon

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-2.5 text-sm rounded-md transition-colors relative",
                    active
                      ? "pl-[10px] pr-3 py-1.5 border-l-2 border-primary font-semibold text-foreground"
                      : "pl-3 pr-3 py-1.5 font-medium text-muted-foreground hover:text-foreground hover:bg-muted/60"
                  )}
                >
                  <Icon className={cn("h-4 w-4 shrink-0", active ? "text-primary" : "")} />
                  <span className="flex-1 truncate">{item.title}</span>
                  {item.isInbox && unread > 0 && (
                    <span className="text-[10px] font-semibold bg-muted text-muted-foreground px-1.5 py-0.5 rounded-full tabular-nums">
                      {unread > 99 ? "99+" : unread}
                    </span>
                  )}
                </Link>
              )
            })}
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="p-2 border-t border-border">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-2.5 px-3 py-1.5 text-sm font-medium text-muted-foreground hover:text-foreground rounded-md hover:bg-muted/60 transition-colors"
        >
          <LogOut className="h-4 w-4 shrink-0" />
          Sign Out
        </button>
      </div>
    </aside>
  )
}
