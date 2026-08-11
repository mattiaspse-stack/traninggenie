import { NextResponse } from "next/server";
import { getD1 } from "../../../db";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as { name?: unknown; email?: unknown; message?: unknown; website?: unknown } | null;
  if (body?.website) return NextResponse.json({ accepted: true }, { status: 202 });

  const name = typeof body?.name === "string" ? body.name.trim() : "";
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  const message = typeof body?.message === "string" ? body.message.trim() : "";
  if (name.length < 2 || name.length > 100 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || message.length > 500) {
    return NextResponse.json({ error: "Kontrollera namn, e-post och meddelande." }, { status: 400 });
  }

  await getD1().prepare(`
    INSERT INTO membership_requests (id, email, full_name, message, status, requested_at)
    VALUES (?, ?, ?, ?, 'pending', CURRENT_TIMESTAMP)
    ON CONFLICT(email) DO UPDATE SET
      full_name = excluded.full_name,
      message = excluded.message,
      status = 'pending',
      requested_at = CURRENT_TIMESTAMP,
      reviewed_at = NULL,
      reviewed_by = NULL
  `).bind(crypto.randomUUID(), email, name, message || null).run();

  return NextResponse.json({ accepted: true }, { status: 202 });
}
