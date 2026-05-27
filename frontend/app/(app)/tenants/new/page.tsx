"use client"

import { useRouter } from "next/navigation"
import Link from "next/link"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { ArrowLeft } from "lucide-react"

import { PageHeader } from "@/components/shared/PageHeader"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { tenantsApi } from "@/lib/api/tenants"
import { invitationsApi } from "@/lib/api/invitations"
import { friendlyError } from "@/lib/axios"

const schema = z.object({
  name: z.string().min(1, "Required"),
  companyEmail: z.string().email("Enter a valid email"),
  timezone: z.string().min(1, "Required"),
  adminEmail: z.string().email().optional().or(z.literal("")),
})
type Values = z.infer<typeof schema>

export default function NewTenantPage() {
  const router = useRouter()
  const qc = useQueryClient()
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      companyEmail: "",
      timezone: "UTC",
      adminEmail: "",
    },
  })

  const mut = useMutation({
    mutationFn: async (data: Values) => {
      const tenant = await tenantsApi.create({
        name: data.name,
        companyEmail: data.companyEmail,
        timezone: data.timezone,
      })
      if (data.adminEmail) {
        await invitationsApi.inviteAdmin(tenant.id, data.adminEmail)
      }
      return tenant
    },
    onSuccess: (t) => {
      qc.invalidateQueries({ queryKey: ["tenants"] })
      toast.success("Tenant created")
      router.push(`/tenants/${t.id}`)
    },
    onError: (e) => toast.error(friendlyError(e)),
  })

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={
          <Link
            href="/tenants"
            className="inline-flex items-center gap-1 hover:text-foreground"
          >
            <ArrowLeft className="h-3 w-3" /> Tenants
          </Link>
        }
        title="Create tenant"
        description="Set up a new organisation and optionally invite its first admin."
      />

      <form
        onSubmit={form.handleSubmit((v) => mut.mutate(v))}
        className="grid gap-6 lg:grid-cols-[2fr_1fr]"
      >
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Organisation</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="name">Tenant name</Label>
                <Input id="name" {...form.register("name")} />
                {form.formState.errors.name && (
                  <p className="text-xs text-destructive">
                    {form.formState.errors.name.message}
                  </p>
                )}
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="companyEmail">Company email</Label>
                  <Input
                    id="companyEmail"
                    type="email"
                    {...form.register("companyEmail")}
                  />
                  {form.formState.errors.companyEmail && (
                    <p className="text-xs text-destructive">
                      {form.formState.errors.companyEmail.message}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="timezone">Timezone</Label>
                  <Input
                    id="timezone"
                    placeholder="America/New_York"
                    {...form.register("timezone")}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>First admin (optional)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Label htmlFor="adminEmail">Admin email</Label>
              <Input
                id="adminEmail"
                type="email"
                placeholder="admin@company.com"
                {...form.register("adminEmail")}
              />
              <p className="text-xs text-muted-foreground">
                We'll send an invitation immediately after creating the tenant.
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardContent className="space-y-2 p-6 text-sm">
              <p className="font-medium">A few things to know</p>
              <ul className="space-y-2 text-muted-foreground">
                <li>• Slug is auto-generated from the tenant name.</li>
                <li>• Timezone is used for reminder scheduling.</li>
                <li>• Archiving a tenant is irreversible.</li>
              </ul>
            </CardContent>
          </Card>
          <Button type="submit" loading={mut.isPending} className="w-full">
            Create tenant
          </Button>
          <Button
            type="button"
            variant="ghost"
            className="w-full"
            onClick={() => router.back()}
          >
            Cancel
          </Button>
        </div>
      </form>
    </div>
  )
}
