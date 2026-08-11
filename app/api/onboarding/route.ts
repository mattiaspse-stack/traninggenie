import { NextResponse } from "next/server";
import { getSupabaseUser } from "../../supabase-server";
import { getD1 } from "../../../db";

type Level = "beginner" | "intermediate" | "advanced" | "none";
type PlanDay = { day: string; title: string; meta: string; type: "strength" | "run" | "recovery"; focus: string };
type Answers = {
  modalities: ("run" | "strength")[];
  goals: string[];
  runningLevel: Level;
  strengthLevel: Level;
  currentTraining: string;
  daysPerWeek: number;
  minutesPerSession: number;
  equipment: string[];
  limitations: string;
  preferredDays: string[];
};

function validAnswers(value: unknown): value is Answers {
  if (!value || typeof value !== "object") return false;
  const a = value as Partial<Answers>;
  return Array.isArray(a.modalities) && a.modalities.length > 0 && a.modalities.every(v => v === "run" || v === "strength")
    && Array.isArray(a.goals) && a.goals.length > 0
    && ["beginner", "intermediate", "advanced", "none"].includes(a.runningLevel ?? "")
    && ["beginner", "intermediate", "advanced", "none"].includes(a.strengthLevel ?? "")
    && Number.isInteger(a.daysPerWeek) && (a.daysPerWeek ?? 0) >= 1 && (a.daysPerWeek ?? 0) <= 7
    && Number.isInteger(a.minutesPerSession) && (a.minutesPerSession ?? 0) >= 20 && (a.minutesPerSession ?? 0) <= 180
    && Array.isArray(a.equipment) && Array.isArray(a.preferredDays)
    && typeof a.currentTraining === "string" && typeof a.limitations === "string";
}

function fallbackPlan(a: Answers) {
  const days = a.preferredDays.length >= a.daysPerWeek ? a.preferredDays.slice(0, a.daysPerWeek) : ["Måndag", "Tisdag", "Onsdag", "Torsdag", "Fredag", "Lördag", "Söndag"].slice(0, a.daysPerWeek);
  const both = a.modalities.length === 2;
  const plan: PlanDay[] = days.map((day, index) => {
    const runDay = a.modalities.includes("run") && (!a.modalities.includes("strength") || index % 2 === 0);
    if (runDay) {
      const advanced = a.runningLevel === "advanced";
      return { day, title: advanced && index === 0 ? "Tröskelintervaller" : index === days.length - 1 ? "Lugn långdistans" : "Lugn distans", meta: `${a.minutesPerSession} min · ${advanced ? "Erfaren nivå" : a.runningLevel === "intermediate" ? "Van nivå" : "Grundnivå"}`, type: "run" as const, focus: advanced ? "Bibehåll kvalitet utan att störa styrkeåterhämtningen." : "Bygg tålighet med kontrollerad ansträngning." };
    }
    return { day, title: both ? "Helkropp · Teknik" : index % 2 ? "Styrka · Underkropp" : "Styrka · Helkropp", meta: `${a.minutesPerSession} min · ${a.strengthLevel === "beginner" ? "Nybörjarnivå" : a.strengthLevel === "intermediate" ? "Van nivå" : "Erfaren nivå"}`, type: "strength" as const, focus: a.strengthLevel === "beginner" ? "Lär in basrörelser och lämna 2–3 repetitioner i reserv." : "Progressiv belastning med stabil teknik." };
  });
  return { overview: `${a.daysPerWeek} pass per vecka, anpassade separat efter din nivå i ${a.modalities.includes("run") ? "löpning" : ""}${both ? " och " : ""}${a.modalities.includes("strength") ? "styrketräning" : ""}.`, rationale: both && a.runningLevel !== a.strengthLevel ? "Dina löp- och styrkepass har olika svårighetsgrad eftersom erfarenheten skiljer sig mellan grenarna." : "Belastningen startar på en nivå som ger progression utan onödigt stora steg.", plan, source: "fallback" };
}

async function generatePlan(a: Answers) {
  const fallback = fallbackPlan(a);
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return fallback;
  const schema = { type: "object", additionalProperties: false, properties: {
    overview: { type: "string" }, rationale: { type: "string" }, plan: { type: "array", minItems: 1, maxItems: 7, items: { type: "object", additionalProperties: false, properties: { day: { type: "string" }, title: { type: "string" }, meta: { type: "string" }, type: { type: "string", enum: ["strength", "run", "recovery"] }, focus: { type: "string" } }, required: ["day", "title", "meta", "type", "focus"] } }
  }, required: ["overview", "rationale", "plan"] };
  const prompt = `Du är TräningsGenie, en trygg svensk träningscoach. Skapa exakt ${a.daysPerWeek} pass för en första normalvecka. Respektera valda träningsformer: skapa aldrig styrkepass om strength inte valts och aldrig löppass om run inte valts. Bedöm löpning och styrka som separata färdigheter; en erfaren löpare kan vara nybörjare i styrka. Anpassa passens innehåll och språk efter respektive nivå, tillgänglig tid, utrustning, begränsningar och önskade dagar. Var konkret men ställ inga diagnoser. Svar: ${JSON.stringify(a)}`;
  try {
    const response = await fetch("https://api.openai.com/v1/responses", { method: "POST", headers: { authorization: `Bearer ${apiKey}`, "content-type": "application/json" }, body: JSON.stringify({ model: process.env.OPENAI_MODEL || "gpt-5.4-mini", input: prompt, text: { format: { type: "json_schema", name: "onboarding_plan", strict: true, schema } } }) });
    if (!response.ok) throw new Error(`OpenAI ${response.status}`);
    const data = await response.json() as { output_text?: string; output?: { content?: { type?: string; text?: string }[] }[] };
    const output = data.output_text ?? data.output?.flatMap(o => o.content ?? []).find(c => c.type === "output_text")?.text;
    if (!output) throw new Error("Tomt AI-svar");
    return { ...JSON.parse(output), source: "openai" } as typeof fallback;
  } catch (error) {
    console.error("Onboarding plan generation failed", error);
    return fallback;
  }
}

export async function POST(request: Request) {
  const identity = await getSupabaseUser(request);
  if (!identity) return NextResponse.json({ error: "Inte inloggad" }, { status: 401 });
  const body = await request.json().catch(() => ({})) as { action?: string; answers?: unknown; proposal?: unknown };
  if (!validAnswers(body.answers)) return NextResponse.json({ error: "Svaren är ofullständiga." }, { status: 400 });
  if (body.action === "generate") return NextResponse.json(await generatePlan(body.answers));
  if (body.action !== "complete") return NextResponse.json({ error: "Ogiltig åtgärd." }, { status: 400 });

  const proposal = body.proposal as { overview?: unknown; rationale?: unknown; plan?: unknown };
  if (!proposal || typeof proposal.overview !== "string" || typeof proposal.rationale !== "string" || !Array.isArray(proposal.plan) || proposal.plan.length < 1 || proposal.plan.length > 7) return NextResponse.json({ error: "Planen är ogiltig." }, { status: 400 });
  const a = body.answers;
  const db = getD1();
  await db.batch([
    db.prepare(`INSERT INTO training_profiles (user_id, modalities_json, goals_json, running_level, strength_level, days_per_week, minutes_per_session, equipment_json, preferred_days_json, current_training, limitations, answers_json, onboarding_complete, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      ON CONFLICT(user_id) DO UPDATE SET modalities_json=excluded.modalities_json, goals_json=excluded.goals_json, running_level=excluded.running_level, strength_level=excluded.strength_level, days_per_week=excluded.days_per_week, minutes_per_session=excluded.minutes_per_session, equipment_json=excluded.equipment_json, preferred_days_json=excluded.preferred_days_json, current_training=excluded.current_training, limitations=excluded.limitations, answers_json=excluded.answers_json, onboarding_complete=1, updated_at=CURRENT_TIMESTAMP`)
      .bind(identity.id, JSON.stringify(a.modalities), JSON.stringify(a.goals), a.runningLevel, a.strengthLevel, a.daysPerWeek, a.minutesPerSession, JSON.stringify(a.equipment), JSON.stringify(a.preferredDays), a.currentTraining, a.limitations, JSON.stringify(a)),
    db.prepare("UPDATE training_plans SET active = 0, updated_at = CURRENT_TIMESTAMP WHERE user_id = ? AND active = 1").bind(identity.id),
    db.prepare("INSERT INTO training_plans (id, user_id, title, plan_json, active, created_at, updated_at) VALUES (?, ?, ?, ?, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)")
      .bind(crypto.randomUUID(), identity.id, "Min personliga startplan", JSON.stringify(proposal)),
  ]);
  return NextResponse.json({ completed: true, plan: proposal });
}
