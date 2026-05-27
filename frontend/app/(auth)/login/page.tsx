"use client"

import { Suspense, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { toast } from "sonner"
import { ArrowRight, Eye, EyeOff, Lock, Mail, Sparkles } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Logo } from "@/components/layout/Logo"
import { useAuth } from "@/hooks/useAuth"
import { friendlyError } from "@/lib/axios"

const loginSchema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(1, "Password is required"),
})
type LoginValues = z.infer<typeof loginSchema>

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  )
}

function LoginForm() {
  const router = useRouter()
  const params = useSearchParams()
  const { login } = useAuth()
  const [showPwd, setShowPwd] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  })

  async function onSubmit(values: LoginValues) {
    setSubmitting(true)
    try {
      await login(values.email, values.password)
      const redirect = params.get("from") ?? "/dashboard"
      router.replace(redirect)
    } catch (err) {
      toast.error(friendlyError(err))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="grid w-full max-w-5xl gap-10 lg:grid-cols-[1.05fr_1fr] lg:gap-16 animate-fade-in">
      {/* Marketing panel */}
      <div className="hidden flex-col justify-between rounded-3xl border border-border bg-card/40 p-10 lg:flex">
        <Logo />
        <div className="space-y-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs text-muted-foreground shadow-sm">
            <Sparkles className="h-3 w-3 text-primary" />
            New: Auto reminders are now live
          </div>
          <h1 className="font-display text-4xl font-semibold leading-[1.1] tracking-tight text-balance">
            The billing & reminder workspace your finance team will{" "}
            <span className="bg-gradient-to-r from-primary to-[hsl(280_85%_55%)] bg-clip-text text-transparent">
              actually love.
            </span>
          </h1>
          <p className="max-w-md text-sm text-muted-foreground">
            Manage customers, products and recurring plans across every tenant —
            with audit-grade visibility and zero spreadsheets.
          </p>
        </div>
        <dl className="grid grid-cols-3 gap-4">
          {[
            { k: "12k+", v: "Active plans" },
            { k: "99.95%", v: "Uptime" },
            { k: "120 ms", v: "p50 latency" },
          ].map((s) => (
            <div
              key={s.v}
              className="rounded-xl border border-border bg-card/60 p-3"
            >
              <dt className="font-display text-lg font-semibold tracking-tight">
                {s.k}
              </dt>
              <dd className="text-xs text-muted-foreground">{s.v}</dd>
            </div>
          ))}
        </dl>
      </div>

      {/* Form panel */}
      <div className="flex flex-col justify-center">
        <div className="mx-auto w-full max-w-md space-y-8 rounded-3xl border border-border bg-card p-8 shadow-pop sm:p-10">
          <div className="space-y-2 lg:hidden">
            <Logo />
          </div>
          <div className="space-y-1.5">
            <h2 className="font-display text-2xl font-semibold tracking-tight">
              Welcome back
            </h2>
            <p className="text-sm text-muted-foreground">
              Sign in to your workspace to continue.
            </p>
          </div>

          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-5"
            noValidate
          >
            <div className="space-y-2">
              <Label htmlFor="email">Work email</Label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@company.com"
                  className="pl-9"
                  {...form.register("email")}
                />
              </div>
              {form.formState.errors.email && (
                <p className="text-xs text-destructive">
                  {form.formState.errors.email.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                <button
                  type="button"
                  className="text-xs font-medium text-muted-foreground hover:text-foreground"
                >
                  Forgot?
                </button>
              </div>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPwd ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  className="pl-9 pr-10"
                  {...form.register("password")}
                />
                <button
                  type="button"
                  onClick={() => setShowPwd((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label={showPwd ? "Hide password" : "Show password"}
                >
                  {showPwd ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
              {form.formState.errors.password && (
                <p className="text-xs text-destructive">
                  {form.formState.errors.password.message}
                </p>
              )}
            </div>

            <Button
              type="submit"
              className="w-full"
              size="lg"
              loading={submitting}
            >
              Sign in
              <ArrowRight className="h-4 w-4" />
            </Button>
          </form>

          <p className="text-center text-xs text-muted-foreground">
            By signing in you agree to our{" "}
            <Link href="#" className="underline-offset-2 hover:underline">
              Terms
            </Link>{" "}
            and{" "}
            <Link href="#" className="underline-offset-2 hover:underline">
              Privacy Policy
            </Link>
            .
          </p>
        </div>
      </div>
    </div>
  )
}
