import { NextResponse } from "next/server";
import { getChatGPTUser } from "../../chatgpt-auth";

const fallback = {
  daily: { title: "Styrka passar bäst idag", summary: "Din återhämtning är god. Kör överkroppspasset och håll två repetitioner i reserv i de tyngsta seten.", reason: "Baserat på 7,4 timmars sömn, träningshistorik och veckomål." },
  adapt: { title: "Passet är anpassat", summary: "Jag sänker volymen med ett set i pressövningarna och behåller rodden för balans. Beräknad tid: 42 minuter.", reason: "Det ger en bra stimulans utan att belasta återhämtningen onödigt." },
  chat: { title: "Coachens förslag", summary: "Jag anpassar träningen efter dagsform och mål. Börja kontrollerat, lämna två repetitioner i reserv och avbryt vid skarp smärta.", reason: "Justera alltid efter hur kroppen faktiskt känns." },
  plan: { title: "Din nya vecka är klar", summary: "Fyra pass med balanserad styrka, kondition och återhämtning.", plan: [
    { day: "Mån 20", title: "Styrka – Överkropp", meta: "18:00 · 55 min", type: "strength" },
    { day: "Ons 22", title: "Löpning – Intervaller", meta: "19:30 · 38 min", type: "run" },
    { day: "Fre 24", title: "Styrka – Underkropp", meta: "17:30 · 50 min", type: "strength" },
    { day: "Sön 26", title: "Lugn distans", meta: "10:00 · 45 min", type: "run" },
  ] },
} as const;

export async function POST(request: Request) {
  if (!await getChatGPTUser()) {
    return NextResponse.json({ error: "Inte inloggad" }, { status: 401 });
  }
  const body = await request.json().catch(() => ({}));
  const mode = (["daily","plan","adapt","chat"].includes(body.mode) ? body.mode : "daily") as keyof typeof fallback;
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return NextResponse.json({ ...fallback[mode], source: "demo" });

  const prompt = `Du är TräningsGenie, en trygg svensk AI-coach. Skapa ett kort, konkret svar för läget ${mode}. Använd profil och kontext, men hitta inte på mätdata. Svara på svenska. Profil: ${JSON.stringify(body.profile)}. Kontext: ${JSON.stringify(body.context)}. Fråga: ${body.message || "Ge dagens bästa rekommendation"}. Vid planläge: skapa exakt fyra planerade dagar och använd endast typerna strength, run eller recovery. Undvik medicinska diagnoser.`;
  const schema = { type: "object", additionalProperties: false, properties: { title: { type: "string" }, summary: { type: "string" }, reason: { type: "string" }, plan: { type: "array", items: { type: "object", additionalProperties: false, properties: { day: { type: "string" }, title: { type: "string" }, meta: { type: "string" }, type: { type: "string", enum: ["strength","run","recovery"] } }, required: ["day","title","meta","type"] } } }, required: ["title","summary","reason","plan"] };
  try {
    const response = await fetch("https://api.openai.com/v1/responses", { method: "POST", headers: { authorization: `Bearer ${apiKey}`, "content-type": "application/json" }, body: JSON.stringify({ model: process.env.OPENAI_MODEL || "gpt-5.4-mini", input: prompt, text: { format: { type: "json_schema", name: "training_coach", strict: true, schema } } }) });
    if (!response.ok) throw new Error(`OpenAI ${response.status}`);
    const data = await response.json() as { output_text?: string; output?: { content?: { type?: string; text?: string }[] }[] };
    const output = data.output_text ?? data.output?.flatMap(o=>o.content ?? []).find(c=>c.type==="output_text")?.text;
    if (!output) throw new Error("Tomt AI-svar");
    return NextResponse.json({ ...JSON.parse(output), source: "openai" });
  } catch (error) {
    console.error("AI coach failed", error);
    return NextResponse.json({ ...fallback[mode], source: "fallback" });
  }
}
