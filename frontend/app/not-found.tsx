import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Logo } from "@/components/layout/Logo"
import { ArrowRight } from "lucide-react"

export default function NotFound() {
  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-background">
      <div className="absolute inset-0 -z-10 bg-grid-pattern bg-[size:32px_32px] opacity-30" />
      <div className="absolute inset-0 -z-10 bg-radial-fade" />
      <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-6 text-center">
        <Logo />
        <p className="font-display text-7xl font-semibold tracking-tight">
          404
        </p>
        <p className="max-w-md text-sm text-muted-foreground">
          We can't find the page you're looking for. It may have been moved or
          archived.
        </p>
        <Button asChild>
          <Link href="/dashboard">
            Back to dashboard
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </main>
    </div>
  )
}
