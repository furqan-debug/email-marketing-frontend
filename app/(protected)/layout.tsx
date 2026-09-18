import Sidebar from "@/components/Sidebar"

export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background flex">
      <Sidebar />
      <main className="flex-1 pl-[220px] min-h-screen">
        <div className="max-w-[1200px] w-full mx-auto px-8 py-6">
          {children}
        </div>
      </main>
    </div>
  )
}
