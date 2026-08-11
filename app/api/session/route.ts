import { NextResponse } from "next/server";
import { getChatGPTUser } from "../../chatgpt-auth";
import { getD1 } from "../../../db";

type AccountRow = {
  id: string;
  email: string;
  full_name: string | null;
  role: "admin" | "user";
};

const ADMIN_EMAIL = (process.env.ADMIN_EMAIL ?? "info@mattiasp.se").trim().toLowerCase();

export async function GET() {
  const identity = await getChatGPTUser();
  if (!identity) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }

  const db = getD1();
  const role = identity.email.trim().toLowerCase() === ADMIN_EMAIL ? "admin" : "user";
  await db.prepare(`
    INSERT INTO app_users (id, email, full_name, role, created_at, updated_at)
    VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    ON CONFLICT(id) DO UPDATE SET
      email = excluded.email,
      full_name = COALESCE(excluded.full_name, app_users.full_name),
      role = excluded.role,
      updated_at = CURRENT_TIMESTAMP
  `).bind(identity.id, identity.email, identity.fullName, role).run();

  const account = await db.prepare(
    "SELECT id, email, full_name, role FROM app_users WHERE id = ? LIMIT 1",
  ).bind(identity.id).first<AccountRow>();

  return NextResponse.json({
    authenticated: true,
    user: {
      id: account?.id ?? identity.id,
      email: account?.email ?? identity.email,
      name: account?.full_name ?? identity.displayName,
      role: account?.role ?? "user",
    },
  });
}
