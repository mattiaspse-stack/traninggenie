import { NextResponse } from "next/server";
import { getChatGPTUser } from "../../../chatgpt-auth";
import { getD1 } from "../../../../db";

export async function GET() {
  const identity = await getChatGPTUser();
  if (!identity) return NextResponse.json({ error: "Inte inloggad" }, { status: 401 });

  const db = getD1();
  const account = await db.prepare("SELECT role FROM app_users WHERE id = ? LIMIT 1")
    .bind(identity.id).first<{ role: string }>();
  if (account?.role !== "admin") {
    return NextResponse.json({ error: "Administratörsbehörighet krävs" }, { status: 403 });
  }

  const result = await db.prepare(
    "SELECT id, email, full_name AS name, role, created_at AS createdAt FROM app_users ORDER BY created_at DESC LIMIT 100",
  ).all();
  return NextResponse.json({ users: result.results });
}
