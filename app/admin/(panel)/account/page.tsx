import type { Metadata } from "next";
import { Crown, Lock, Mail, UserRound } from "lucide-react";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { ChangePasswordForm } from "@/components/admin/change-password-form";
import { Alert, PageHeader } from "@/components/admin/ui";
import { ROLE_LABEL } from "@/lib/admin/permissions";
import { getAdmin } from "@/lib/server/admin/session";

export const metadata: Metadata = { title: "My account" };

const panel = "rounded-2xl border border-brand-bright/25 bg-linear-to-b from-[#0c1a24] to-panel p-5 shadow-[0_0_44px_-20px_rgba(0,150,219,0.5)] sm:p-6";

function PanelHead({ icon, title, text }: { icon: ReactNode; title: string; text: string }) {
  return (
    <div className="mb-6 flex items-center gap-4">
      <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-linear-to-br from-brand/25 to-brand/5 text-brand-bright ring-1 ring-brand-bright/25 [&>svg]:size-6">{icon}</span>
      <div>
        <h2 className="font-(family-name:--font-display) text-xl font-bold">{title}</h2>
        <p className="text-sm text-muted">{text}</p>
      </div>
    </div>
  );
}

function InfoRow({ icon, label, children }: { icon: ReactNode; label: string; children: ReactNode }) {
  return (
    <div className="grid overflow-hidden rounded-xl border border-white/10 bg-black/20 sm:grid-cols-[170px_1fr]">
      <div className="flex items-center gap-3 border-b border-white/8 bg-white/4 px-4 py-3.5 text-sm text-white/80 sm:border-b-0 sm:border-r [&>svg]:size-4 [&>svg]:text-white/50">
        {icon}
        {label}
      </div>
      <div className="flex min-w-0 items-center px-4 py-3.5 text-base font-semibold wrap-anywhere">{children}</div>
    </div>
  );
}

export default async function AccountPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const admin = await getAdmin();
  if (!admin) redirect("/admin/login");
  const forced = admin.mustChangePassword;
  await searchParams;
  const initial = (admin.name || admin.email).trim().charAt(0).toUpperCase();

  return (
    <div className="grid gap-6">
      <PageHeader icon={<UserRound />} title="My Account" description="Your sign-in details and password." />

      {forced ? (
        <Alert tone="warning">
          For your security, set a new password before using the admin panel. Choose something only you know:
          at least 12 characters with upper and lower case letters, a number and a symbol.
        </Alert>
      ) : null}

      <section className={panel}>
        <PanelHead icon={<UserRound />} title="Profile" text="Your basic account information." />
        <div className="grid items-center gap-8 lg:grid-cols-[220px_1fr] lg:divide-x lg:divide-white/10">
          <div className="flex justify-center">
            <span className="grid size-36 place-items-center rounded-full bg-linear-to-br from-brand-bright to-[#04567f] text-6xl font-extrabold text-white shadow-[0_16px_50px_-14px_rgba(0,150,219,0.9)] ring-8 ring-white/6">
              {initial}
            </span>
          </div>
          <div className="grid gap-3 lg:pl-8">
            <InfoRow icon={<UserRound />} label="Name">
              {admin.name || "-"}
            </InfoRow>
            <InfoRow icon={<Mail />} label="Email">
              {admin.email}
            </InfoRow>
            <InfoRow icon={<Crown />} label="Role">
              <span className="inline-flex items-center rounded-full bg-brand px-4 py-1 text-sm font-bold text-white shadow-[0_6px_18px_-8px_rgba(0,150,219,0.9)]">{ROLE_LABEL[admin.role]}</span>
            </InfoRow>
          </div>
        </div>
      </section>

      <section className={panel}>
        <PanelHead icon={<Lock />} title="Change Password" text="Changing it signs you out of all other devices." />
        <ChangePasswordForm />
      </section>
    </div>
  );
}
