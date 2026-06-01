import { createClient as createAdminClient } from "@supabase/supabase-js";
import AdminContactMessagesClient, {
  type ContactMessage,
} from "@/components/admin/AdminContactMessagesClient";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export const metadata = { title: "Messages de contact — Administration" };

export default async function AdminMessagesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const { data: profile } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "admin") redirect("/");

  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: rows } = await admin
    .from("contact_messages")
    .select("id, name, email, subject, message, is_read, created_at")
    .order("created_at", { ascending: false });

  const messages: ContactMessage[] = (rows ?? []).map((r) => ({
    id: r.id as string,
    name: (r.name as string) ?? "",
    email: (r.email as string) ?? "",
    subject: (r.subject as string) ?? "",
    message: (r.message as string) ?? "",
    isRead: !!(r.is_read as boolean),
    createdAt: (r.created_at as string) ?? "",
  }));

  return (
    <div className="max-w-5xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-charcoal-800">Messages de contact</h1>
        <p className="text-sm text-charcoal-400 mt-0.5">
          {messages.length} message{messages.length !== 1 ? "s" : ""} au total
        </p>
      </div>
      <AdminContactMessagesClient initialMessages={messages} />
    </div>
  );
}
