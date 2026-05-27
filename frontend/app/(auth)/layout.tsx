export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-background">
      <div className="absolute inset-0 -z-10 bg-grid-pattern bg-[size:32px_32px] opacity-40" />
      <div className="absolute inset-0 -z-10 bg-radial-fade" />
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[480px] bg-gradient-to-b from-primary/5 to-transparent" />
      <main className="relative flex min-h-screen items-center justify-center p-6">
        {children}
      </main>
    </div>
  )
}
