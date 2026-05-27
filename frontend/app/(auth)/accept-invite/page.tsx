"use client"

import { Suspense, useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import axios from "axios"
import { toast } from "sonner"
import {
  ArrowRight,
  Eye,
  EyeOff,
  Lock,
  MailWarning,
  ShieldCheck,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Logo } from "@/components/layout/Logo"
import { authApi } from "@/lib/api/auth"
import { friendlyError } from "@/lib/axios"
import type { ApiError } from "@/types/api"

const schema = z
  .object({
    password: z.string().min(8, "Use at least 8 characters"),
    confirm: z.string(),
  })
  .refine((d) => d.password === d.confirm, {
    message: "Passwords must match",
    path: ["confirm"],
  })
type Values = z.infer<typeof schema>

export default function AcceptInvitePage() {
  return (
    <Suspense fallback={null}>
      <AcceptInviteForm />
    </Suspense>
  )
}

function AcceptInviteForm() {
  const router = useRouter()
  const params = useSearchParams()
  const token = params.get("token") ?? ""
  const [submitting, setSubmitting] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)
  const [showPwd, setShowPwd] = useState(false)

  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { password: "", confirm: "" },
  })

  // Token missing entirely — no point rendering the form.
  if (!token) {
    return (
      <div className="mx-auto w-full max-w-md space-y-6 rounded-3xl border border-border bg-card p-8 text-center shadow-pop sm:p-10 animate-fade-in">
        <Logo className="mx-auto justify-center" />
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
          <MailWarning className="h-6 w-6" />
        </div>
        <div className="space-y-1.5">
          <h1 className="font-display text-xl font-semibold tracking-tight">
            Invitation link is incomplete
          </h1>
          <p className="text-sm text-muted-foreground">
            We couldn't find an invitation token in this URL. Please open the
            link from your invitation email exactly as it was sent.
          </p>
        </div>
        <Button asChild variant="outline" className="w-full">
          <Link href="/login">Back to sign in</Link>
        </Button>
      </div>
    )
  }

  async function onSubmit(values: Values) {
    setSubmitting(true)
    setServerError(null)
    try {
      await authApi.acceptInvite(token, values.password)
      toast.success("Account activated. Please sign in to continue.")
      router.replace("/login")
    } catch (err) {
      const message = resolveInviteError(err)
      setServerError(message)
      toast.error(message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="mx-auto w-full max-w-md space-y-8 rounded-3xl border border-border bg-card p-8 shadow-pop sm:p-10 animate-fade-in">
      <Logo />
      <div className="space-y-2">
        <div className="inline-flex items-center gap-2 rounded-full border border-border bg-accent px-3 py-1 text-xs text-accent-foreground">
          <ShieldCheck className="h-3 w-3" />
          You've been invited
        </div>
        <h1 className="font-display text-2xl font-semibold tracking-tight">
          Set up your password
        </h1>
        <p className="text-sm text-muted-foreground">
          Choose a strong password to activate your account. You'll sign in on
          the next screen.
        </p>
      </div>

      {serverError && (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-xl border border-destructive/20 bg-destructive/5 px-3 py-2.5 text-xs text-destructive"
        >
          <MailWarning className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>{serverError}</span>
        </div>
      )}

      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="space-y-5"
        noValidate
      >
        <div className="space-y-2">
          <Label htmlFor="password">New password</Label>
          <div className="relative">
            <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="password"
              type={showPwd ? "text" : "password"}
              autoComplete="new-password"
              placeholder="At least 8 characters"
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

        <div className="space-y-2">
          <Label htmlFor="confirm">Confirm password</Label>
          <div className="relative">
            <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="confirm"
              type={showPwd ? "text" : "password"}
              autoComplete="new-password"
              placeholder="Re-enter password"
              className="pl-9"
              {...form.register("confirm")}
            />
          </div>
          {form.formState.errors.confirm && (
            <p className="text-xs text-destructive">
              {form.formState.errors.confirm.message}
            </p>
          )}
        </div>

        <Button type="submit" className="w-full" size="lg" loading={submitting}>
          Activate account
          <ArrowRight className="h-4 w-4" />
        </Button>

        <p className="text-center text-xs text-muted-foreground">
          Already activated?{" "}
          <Link
            href="/login"
            className="font-medium text-foreground underline-offset-4 hover:underline"
          >
            Sign in
          </Link>
        </p>
      </form>
    </div>
  )
}

function resolveInviteError(err: unknown): string {
  if (axios.isAxiosError(err)) {
    const status = err.response?.status
    const code = (err.response?.data as ApiError | undefined)?.error?.code
    if (status === 400 && code === "INVALID_TOKEN") {
      return "This invitation link is not valid. Ask your admin to send a new one."
    }
    if (status === 400) {
      return "This invitation link has expired or is no longer valid. Ask your admin to resend it."
    }
    if (status === 409) {
      return "An account already exists for this email. Try signing in instead."
    }
  }
  return friendlyError(err)
}
