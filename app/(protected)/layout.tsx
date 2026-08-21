import Sidebar from "@/components/Sidebar"

export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background flex">
      <Sidebar />
      <main className="flex-1 pl-64 flex flex-col min-h-screen">
        <div className="flex-1 max-w-7xl w-full mx-auto p-6 md:p-8">
          {children}
        </div>
      </main>
    </div>
  )
}
