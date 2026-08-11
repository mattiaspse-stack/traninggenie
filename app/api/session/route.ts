import { NextResponse } from "next/server";
import { getSupabaseUser } from "../../supabase-server";
import { getD1 } from "../../../db";

type AccountRow = {
  id: string;
  email: string;
  full_name: string | null;
  role: "admin" | "user";
};

const ADMIN_EMAIL = (process.env.ADMIN_EMAIL ?? "info@mattiasp.se").trim().toLowerCase();

export async function GET(request: Request) {
  const identity = await getSupabaseUser(request);
  if (!identity) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }

  const db = getD1();
  const email = identity.email ?? "";
  const fullName = typeof identity.user_metadata?.full_name === "string" ? identity.user_metadata.full_name : null;
  const role = email.trim().toLowerCase() === ADMIN_EMAIL ? "admin" : "user";
  await db.prepare(`
    INSERT INTO app_users (id, email, full_name, role, created_at, updated_at)
    VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    ON CONFLICT(id) DO UPDATE SET
      email = excluded.email,
      full_name = COALESCE(excluded.full_name, app_users.full_name),
      role = excluded.role,
      updated_at = CURRENT_TIMESTAMP
  `).bind(identity.id, email, fullName, role).run();

  const account = await db.prepare(
    "SELECT id, email, full_name, role FROM app_users WHERE id = ? LIMIT 1",
  ).bind(identity.id).first<AccountRow>();
  const trainingProfile = await db.prepare(
    "SELECT onboarding_complete FROM training_profiles WHERE user_id = ? LIMIT 1",
  ).bind(identity.id).first<{ onboarding_complete: number }>();

  return NextResponse.json({
    authenticated: true,
    user: {
      id: account?.id ?? identity.id,
      email: account?.email ?? email,
      name: account?.full_name ?? fullName ?? email,
      role: account?.role ?? "user",
      onboardingComplete: Boolean(trainingProfile?.onboarding_complete),
    },
  });
}
