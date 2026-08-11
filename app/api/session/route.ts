import { NextResponse } from "next/server";
import { getChatGPTUser } from "../../chatgpt-auth";
import { getD1 } from "../../../db";

type AccountRow = {
  id: string;
  email: string;
  full_name: string | null;
  role: "admin" | "user";
};

export async function GET() {
  const identity = await getChatGPTUser();
  if (!identity) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }

  const db = getD1();
  await db.prepare(`
    INSERT INTO app_users (id, email, full_name, role, created_at, updated_at)
    VALUES (?, ?, ?,
      CASE WHEN EXISTS (SELECT 1 FROM app_users WHERE role = 'admin') THEN 'user' ELSE 'admin' END,
      CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    ON CONFLICT(id) DO UPDATE SET
      email = excluded.email,
      full_name = COALESCE(excluded.full_name, app_users.full_name),
      updated_at = CURRENT_TIMESTAMP
  `).bind(identity.id, identity.email, identity.fullName).run();

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
