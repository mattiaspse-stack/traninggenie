"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { getSupabaseBrowserClient } from "./supabase";

type View = "hem" | "pass" | "statistik" | "planer" | "profil";
type AccountSession = { id: string; email: string; name: string; role: "admin" | "user"; onboardingComplete: boolean };
type CoachReply = { title?: string; summary: string; reason?: string; plan?: PlanDay[]; source?: string };
type PlanDay = { day: string; title: string; meta: string; type: "strength" | "run" | "recovery" };
type TrainingLevel = "beginner" | "intermediate" | "advanced" | "none";
type OnboardingAnswers = { modalities: ("run" | "strength")[]; goals: string[]; runningLevel: TrainingLevel; strengthLevel: TrainingLevel; currentTraining: string; daysPerWeek: number; minutesPerSession: number; equipment: string[]; limitations: string; preferredDays: string[] };
type PlanProposal = { overview: string; rationale: string; plan: (PlanDay & { focus: string })[]; source?: string };

const defaultPlan: PlanDay[] = [
  { day: "Mån 20", title: "Styrka – Överkropp", meta: "18:00 · 60 min", type: "strength" },
  { day: "Ons 22", title: "Löpning – Intervaller", meta: "19:30 · 40 min", type: "run" },
  { day: "Fre 24", title: "Rörlighet & Core", meta: "17:30 · 25 min", type: "recovery" },
];

const exercises = [
  ["Bänkpress", "4 × 8–10"], ["Lutande hantelpress", "3 × 8–10"],
  ["Sittande rodd", "3 × 10–12"], ["Axelpress", "3 × 8–10"], ["Dips", "3 × 10–12"],
];

export default function Home() {
  const [session, setSession] = useState<AccountSession | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [authState, setAuthState] = useState<"checking" | "authenticated" | "anonymous" | "error">(() => getSupabaseBrowserClient() ? "checking" : "error");
  const [view, setView] = useState<View>("hem");
  const [plan, setPlan] = useState(defaultPlan);
  const [coach, setCoach] = useState<CoachReply>({ summary: "Jag analyserar din återhämtning, historik och veckomål…" });
  const [coachOpen, setCoachOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sessionOpen, setSessionOpen] = useState(false);

  const askAI = async (mode: "daily" | "plan" | "adapt" | "chat", message = "") => {
    setLoading(true);
    try {
      const response = await fetch("/api/coach", { method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${accessToken}` }, body: JSON.stringify({ mode, message, profile: { goal: "Bygga styrka och springa 10 km", level: "Van", days: 4 }, context: { sleep: 7.4, readiness: 82, recent: "Överkropp i går, löpning för tre dagar sedan" } }) });
      const data = await response.json() as CoachReply;
      setCoach(data);
      if (data.plan) setPlan(data.plan);
    } catch {
      setCoach({ summary: "Jag kunde inte nå AI-coachen just nu. Försök igen om en stund.", source: "error" });
    } finally { setLoading(false); }
  };

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;
    const loadProfile = async (token: string | null) => {
      if (!token) { setSession(null); setAccessToken(null); setAuthState("anonymous"); return; }
      setAccessToken(token);
      const response = await fetch("/api/session", { cache: "no-store", headers: { authorization: `Bearer ${token}` } });
      if (!response.ok) throw new Error("session");
      const data = await response.json() as { user: AccountSession };
      setSession(data.user);
      setAuthState("authenticated");
    };
    void supabase.auth.getSession().then(({ data }) => loadProfile(data.session?.access_token ?? null)).catch(() => setAuthState("error"));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, current) => {
      void loadProfile(current?.access_token ?? null).catch(() => setAuthState("error"));
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (authState !== "authenticated") return;
    const controller = new AbortController();
    fetch("/api/coach", { method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${accessToken}` }, body: JSON.stringify({ mode: "daily", profile: { goal: "Bygga styrka och springa 10 km", level: "Van", days: 4 }, context: { sleep: 7.4, readiness: 82, recent: "Överkropp i går, löpning för tre dagar sedan" } }), signal: controller.signal })
      .then(response => response.json())
      .then((data: CoachReply) => setCoach(data))
      .catch(error => { if (error instanceof Error && error.name !== "AbortError") setCoach({ summary: "Jag kunde inte nå AI-coachen just nu.", source: "error" }); })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [authState, accessToken]);

  if (authState !== "authenticated" || !session) return <AuthScreen state={authState} />;
  if (!session.onboardingComplete) return <Onboarding accessToken={accessToken ?? ""} name={session.name} onComplete={(proposal) => { setPlan(proposal.plan); setSession({ ...session, onboardingComplete: true }); }} />;

  return (
    <main className="stage app-stage">
      <section className="phone-app app-shell">
        <header className="statusbar app-header"><span>TräningsGenie</span><span className="brand-mini">TG</span><span>{session.name}</span></header>
        <BottomNav view={view} setView={setView} session={session} />
        <div className="screen">
          {view === "hem" && <Dashboard coach={coach} loading={loading} onCoach={() => setCoachOpen(true)} onStart={() => { setSessionOpen(true); setView("pass"); }} />}
          {view === "pass" && <Workout open={sessionOpen} onStart={() => setSessionOpen(true)} onAdapt={() => { setCoachOpen(true); void askAI("adapt"); }} />}
          {view === "statistik" && <Statistics />}
          {view === "planer" && <Planner plan={plan} loading={loading} onGenerate={() => void askAI("plan")} />}
          {view === "profil" && <Profile session={session} accessToken={accessToken ?? ""} />}
        </div>
        <button className="ai-fab" onClick={() => setCoachOpen(true)} aria-label="Öppna AI-coachen"><span>✦</span></button>
        {coachOpen && <CoachSheet coach={coach} loading={loading} onClose={() => setCoachOpen(false)} onAsk={(text) => void askAI("chat", text)} />}
      </section>
    </main>
  );
}

function AuthScreen({ state }: { state: "checking" | "authenticated" | "anonymous" | "error" }) {
  const checking = state === "checking";
  const [mode, setMode] = useState<"login" | "request">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [requestMessage, setRequestMessage] = useState("");
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setPending(true); setMessage("");
    if (mode === "request") {
      const response = await fetch("/api/invitations", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ name, email, message: requestMessage }) });
      setPending(false);
      setMessage(response.ok ? "Tack! Din förfrågan är skickad och väntar på granskning." : "Förfrågan kunde inte skickas. Kontrollera uppgifterna.");
      return;
    }
    const supabase = getSupabaseBrowserClient();
    if (!supabase) { setPending(false); setMessage("Supabase-nyckeln saknas i .env."); return; }
    const result = await supabase.auth.signInWithPassword({ email, password });
    setPending(false);
    if (result.error) { setMessage(result.error.message); return; }
  };
  return <main className="stage auth-stage"><aside className="auth-benefits" aria-label="Det här får du med Training Genie">
    <small>DIN TRÄNING, SMARTARE</small>
    <h2>Bygg vanor som faktiskt håller.</h2>
    <p>Training Genie samlar planering, genomförande och utveckling i ett enkelt flöde.</p>
    <div><span>01</span><section><strong>En plan som passar dig</strong><p>Träningen anpassas efter dina mål, din nivå och tiden du har.</p></section></div>
    <div><span>02</span><section><strong>All träning på samma plats</strong><p>Logga styrkepass och löpning utan att tappa överblicken.</p></section></div>
    <div><span>03</span><section><strong>Se att du går framåt</strong><p>Följ kontinuitet, resultat och progression vecka för vecka.</p></section></div>
    <div><span>04</span><section><strong>En coach nära till hands</strong><p>Få konkreta AI-råd när passet eller dagsformen behöver justeras.</p></section></div>
  </aside><section className="phone-app auth-phone"><div className="auth-screen">
    <Image className="auth-logo-image" src="/training-genie-logo.png" width={1254} height={1254} alt="Training Genie" priority />
    <h1>{checking ? "Förbereder din profil…" : state === "error" ? "Inloggningen behöver konfigureras" : mode === "login" ? "Välkommen tillbaka." : "Begär en inbjudan."}</h1>
    <p>{checking ? "Vi kontrollerar din säkra inloggning." : state === "error" ? "Lägg Supabase URL och publishable key i projektets .env-fil." : mode === "login" ? "Logga in för att fortsätta din träning." : "Berätta vem du är så återkommer vi när din medlemsansökan har granskats."}</p>
    {!checking && state !== "error" && <><div className="auth-tabs"><button className={mode === "login" ? "active" : ""} onClick={() => { setMode("login"); setMessage(""); }}>Logga in</button><button className={mode === "request" ? "active" : ""} onClick={() => { setMode("request"); setMessage(""); }}>Begär inbjudan</button></div><form className="auth-form" onSubmit={submit}>{mode === "request" && <label><span>Namn</span><input required autoComplete="name" value={name} onChange={event => setName(event.target.value)} placeholder="Ditt namn" /></label>}<label><span>E-post</span><input required type="email" autoComplete="email" value={email} onChange={event => setEmail(event.target.value)} placeholder="namn@exempel.se" /></label>{mode === "login" ? <label><span>Lösenord</span><input required minLength={8} type="password" autoComplete="current-password" value={password} onChange={event => setPassword(event.target.value)} placeholder="Ditt lösenord" /></label> : <label><span>Kort meddelande (valfritt)</span><textarea maxLength={500} value={requestMessage} onChange={event => setRequestMessage(event.target.value)} placeholder="Varför vill du bli medlem?" /></label>}<input className="auth-honeypot" tabIndex={-1} autoComplete="off" aria-hidden="true" name="website" />{message && <p className="auth-message" role="status">{message}</p>}<button className="gradient-button auth-button" disabled={pending}>{pending ? "Vänta…" : mode === "login" ? "Logga in" : "Skicka förfrågan"}</button></form></>}
    {state === "error" && <button className="gradient-button auth-button" onClick={() => location.reload()}>Försök igen</button>}
    <em>Din träningsdata är privat och kopplad till ditt konto.</em>
  </div></section></main>;
}

function Onboarding({ accessToken, name, onComplete }: { accessToken: string; name: string; onComplete: (proposal: PlanProposal) => void }) {
  const [answers, setAnswers] = useState<OnboardingAnswers>({ modalities: [], goals: [], runningLevel: "none", strengthLevel: "none", currentTraining: "", daysPerWeek: 4, minutesPerSession: 45, equipment: [], limitations: "", preferredDays: [] });
  const [step, setStep] = useState(0);
  const [proposal, setProposal] = useState<PlanProposal | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const firstName = name.split(/\s+/)[0] || "där";
  const steps = ["modalities", "goals", ...(answers.modalities.includes("run") ? ["running"] : []), ...(answers.modalities.includes("strength") ? ["strength"] : []), "history", "availability", ...(answers.modalities.includes("strength") ? ["equipment"] : []), "limitations", "days"];
  const current = steps[step];
  const toggle = <T extends string>(list: T[], value: T) => list.includes(value) ? list.filter(item => item !== value) : [...list, value];
  const levelLabel: Record<TrainingLevel, string> = { beginner: "Nybörjare", intermediate: "Van", advanced: "Erfaren", none: "Inte valt" };
  const canContinue = current === "modalities" ? answers.modalities.length > 0 : current === "goals" ? answers.goals.length > 0 : current === "running" ? answers.runningLevel !== "none" : current === "strength" ? answers.strengthLevel !== "none" : current === "history" ? answers.currentTraining.trim().length >= 3 : current === "equipment" ? answers.equipment.length > 0 : current === "days" ? answers.preferredDays.length >= answers.daysPerWeek : true;
  const generate = async () => {
    setPending(true); setError("");
    try {
      const response = await fetch("/api/onboarding", { method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${accessToken}` }, body: JSON.stringify({ action: "generate", answers }) });
      const data = await response.json() as PlanProposal & { error?: string };
      if (!response.ok) throw new Error(data.error || "Planen kunde inte skapas.");
      setProposal(data);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Något gick fel."); }
    finally { setPending(false); }
  };
  const finish = async () => {
    if (!proposal) return;
    setPending(true); setError("");
    try {
      const response = await fetch("/api/onboarding", { method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${accessToken}` }, body: JSON.stringify({ action: "complete", answers, proposal }) });
      const data = await response.json() as { error?: string };
      if (!response.ok) throw new Error(data.error || "Planen kunde inte sparas.");
      onComplete(proposal);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Något gick fel."); }
    finally { setPending(false); }
  };
  const next = () => { if (step === steps.length - 1) void generate(); else setStep(value => value + 1); };
  const Choice = ({ active, title, detail, onClick }: { active: boolean; title: string; detail?: string; onClick: () => void }) => <button type="button" className={`onboarding-choice ${active ? "active" : ""}`} onClick={onClick}><i>{active ? "✓" : ""}</i><span><strong>{title}</strong>{detail && <small>{detail}</small>}</span></button>;
  const heading: Record<string, [string, string]> = {
    modalities: [`Vad vill du träna, ${firstName}?`, "Välj en eller kombinera. Jag bedömer varje gren separat."], goals: ["Vad vill du uppnå?", "Du kan välja flera mål. Planen prioriterar dem tillsammans."], running: ["Hur erfaren är du inom löpning?", "Tänk på din nuvarande löpning, inte din allmänna kondition."], strength: ["Hur erfaren är du inom styrketräning?", "Det är helt normalt att ha en annan nivå här än i löpning."], history: ["Hur tränar du idag?", "Berätta kort om veckomängd, distanser, tempo, övningar eller vikter."], availability: ["Hur mycket tid har du?", "Jag bygger en plan som faktiskt ryms i din vecka."], equipment: ["Vilken utrustning har du?", "Jag väljer bara övningar du har möjlighet att genomföra."], limitations: ["Något jag behöver ta hänsyn till?", "Skriv skador, besvär eller övningar du vill undvika. Lämna tomt om inget finns."], days: ["Vilka dagar passar bäst?", `Välj minst ${answers.daysPerWeek} dagar så fördelar jag belastningen smart.`],
  };
  return <main className="onboarding-stage"><section className="onboarding-shell"><aside className="onboarding-aside"><div className="onboarding-brand"><Image src="/training-genie-logo.png" width={74} height={74} alt="Training Genie" /><span><strong>TRAINING</strong><b>GENIE</b></span></div><div><small>DIN PERSONLIGA START</small><h1>En plan byggd runt dig.</h1><p>Löpning och styrka bedöms var för sig. Din plan blir lika avancerad eller grundläggande som du behöver inom varje del.</p></div><ul><li className="active">Mål och träningsform</li><li className={step >= 2 ? "active" : ""}>Nivå och erfarenhet</li><li className={step >= Math.max(4, steps.length - 4) ? "active" : ""}>Tid och förutsättningar</li><li className={proposal ? "active" : ""}>Din första plan</li></ul></aside><section className="onboarding-main">{proposal ? <div className="plan-review"><div className="ai-message"><span>✦</span><div><small>TRÄNINGSGENIE AI</small><h2>Din startplan är klar.</h2><p>{proposal.overview}</p><em>{proposal.rationale}</em></div></div><div className="proposal-grid">{proposal.plan.map(item => <article key={`${item.day}-${item.title}`}><span className={item.type}>{item.type === "run" ? "LÖP" : item.type === "strength" ? "STYRKA" : "VILA"}</span><small>{item.day}</small><h3>{item.title}</h3><p>{item.meta}</p><em>{item.focus}</em></article>)}</div>{error && <p className="onboarding-error">{error}</p>}<div className="onboarding-actions"><button className="secondary-button" disabled={pending} onClick={() => setProposal(null)}>Justera svar</button><button className="gradient-button" disabled={pending} onClick={() => void finish()}>{pending ? "Sparar planen…" : "Godkänn och starta"}</button></div></div> : <><div className="onboarding-progress"><span style={{ width: `${((step + 1) / steps.length) * 100}%` }} /></div><div className="ai-question"><span>✦</span><div><small>FRÅGA {step + 1} AV {steps.length}</small><h2>{heading[current][0]}</h2><p>{heading[current][1]}</p></div></div><div className="onboarding-answer">
    {current === "modalities" && <div className="choice-grid"><Choice active={answers.modalities.includes("run")} title="Löpning" detail="Distans, tempo och uthållighet" onClick={() => setAnswers(a => ({ ...a, modalities: toggle(a.modalities, "run"), runningLevel: a.modalities.includes("run") ? "none" : a.runningLevel }))} /><Choice active={answers.modalities.includes("strength")} title="Styrketräning" detail="Teknik, styrka och progression" onClick={() => setAnswers(a => ({ ...a, modalities: toggle(a.modalities, "strength"), strengthLevel: a.modalities.includes("strength") ? "none" : a.strengthLevel }))} /></div>}
    {current === "goals" && <div className="choice-grid">{["Bli starkare", "Springa snabbare", "Orka längre", "Bygga muskler", "Må bättre", "Skapa en hållbar vana"].map(value => <Choice key={value} active={answers.goals.includes(value)} title={value} onClick={() => setAnswers(a => ({ ...a, goals: toggle(a.goals, value) }))} />)}</div>}
    {(current === "running" || current === "strength") && <div className="level-grid">{(["beginner", "intermediate", "advanced"] as TrainingLevel[]).map(level => <Choice key={level} active={(current === "running" ? answers.runningLevel : answers.strengthLevel) === level} title={levelLabel[level]} detail={level === "beginner" ? "Ny eller oregelbunden" : level === "intermediate" ? "Tränar regelbundet" : "Flera års strukturerad träning"} onClick={() => setAnswers(a => ({ ...a, [current === "running" ? "runningLevel" : "strengthLevel"]: level }))} />)}</div>}
    {current === "history" && <textarea className="onboarding-textarea" autoFocus value={answers.currentTraining} onChange={event => setAnswers(a => ({ ...a, currentTraining: event.target.value }))} placeholder="Exempel: Jag springer 30–40 km per vecka och har sprungit milen på 45 minuter. Jag har nästan ingen erfarenhet av gymträning." />}
    {current === "availability" && <div className="availability-grid"><label><span>Pass per vecka</span><strong>{answers.daysPerWeek}</strong><input type="range" min="1" max="7" value={answers.daysPerWeek} onChange={event => setAnswers(a => ({ ...a, daysPerWeek: Number(event.target.value), preferredDays: a.preferredDays.slice(0, Number(event.target.value)) }))} /></label><label><span>Minuter per pass</span><strong>{answers.minutesPerSession}</strong><input type="range" min="20" max="120" step="5" value={answers.minutesPerSession} onChange={event => setAnswers(a => ({ ...a, minutesPerSession: Number(event.target.value) }))} /></label></div>}
    {current === "equipment" && <div className="choice-grid">{["Fullständigt gym", "Hantlar", "Skivstång", "Maskiner", "Gummiband", "Kroppsvikt hemma"].map(value => <Choice key={value} active={answers.equipment.includes(value)} title={value} onClick={() => setAnswers(a => ({ ...a, equipment: toggle(a.equipment, value) }))} />)}</div>}
    {current === "limitations" && <textarea className="onboarding-textarea" autoFocus value={answers.limitations} onChange={event => setAnswers(a => ({ ...a, limitations: event.target.value }))} placeholder="Inga kända begränsningar" />}
    {current === "days" && <div className="day-grid">{["Måndag", "Tisdag", "Onsdag", "Torsdag", "Fredag", "Lördag", "Söndag"].map(value => <Choice key={value} active={answers.preferredDays.includes(value)} title={value} onClick={() => setAnswers(a => ({ ...a, preferredDays: toggle(a.preferredDays, value) }))} />)}</div>}
  </div>{error && <p className="onboarding-error">{error}</p>}<div className="onboarding-actions"><button className="secondary-button" disabled={step === 0 || pending} onClick={() => setStep(value => value - 1)}>Tillbaka</button><button className="gradient-button" disabled={!canContinue || pending} onClick={next}>{pending ? "AI bygger din plan…" : step === steps.length - 1 ? "Skapa min plan" : "Fortsätt"}</button></div></>}</section></section></main>;
}

function PageTop({ title, back }: { title?: string; back?: boolean }) {
  return <div className="page-top"><button aria-label="Meny">{back ? "‹" : "☰"}</button>{title ? <strong>{title}</strong> : <span></span>}<button aria-label="Notiser">♢<i></i></button></div>;
}

function Dashboard({ coach, loading, onCoach, onStart }: { coach: CoachReply; loading: boolean; onCoach: () => void; onStart: () => void }) {
  return <div className="view home-view">
    <PageTop />
    <section className="welcome"><p>Hej Mattias! <span>👋</span></p><small>Dags att bli starkare än igår.</small></section>
    <section className="stat-pair">
      <div className="glass-card"><label>Veckostatistik</label><strong>4 <small>/ 6</small></strong><span>Träningspass</span><div className="bars">{[38,62,34,70,48,83,67].map((h,i)=><i key={i} style={{height:h}} />)}</div></div>
      <div className="glass-card"><label>Dagens statistik</label><strong>🔥 510</strong><span>Kcal förbränt</span><div className="spark">⌁⌁⌁⌁</div></div>
    </section>
    <button className="ai-insight" onClick={onCoach}><span className="ai-orb">✦</span><span><label>AI-COACHEN · IDAG</label><strong>{loading ? "Analyserar din dag…" : coach.title ?? "Din smarta rekommendation"}</strong><small>{coach.summary}</small></span><b>›</b></button>
    <section className="goal-card"><div className="goal-ring"><strong>75%</strong></div><div><h3>Dagens mål</h3><p><i>✓</i> Träna 45 min</p><p><i>✓</i> 10 000 steg</p><p><i>✓</i> Ät hälsosamt</p><p><i className="empty">○</i> Drick 2L vatten</p></div></section>
    <SectionTitle title="Nästa pass" action="Visa alla" />
    <button className="next-workout" onClick={onStart}><span><strong>Styrka – Överkropp 💪</strong><small>Idag 18:00 · 60 min</small></span><Image src="/workout-hero.png" width={160} height={100} alt="Överkroppspass" /></button>
    <SectionTitle title="Aktiviteter" action="Visa alla" />
    <div className="activity-card"><span className="run-icon">♙</span><span><strong>Löpning</strong><small>5,2 km · 28:15 · 5:25 min/km</small></span><div className="route-mini"></div></div>
  </div>;
}

function Workout({ open, onStart, onAdapt }: { open: boolean; onStart: () => void; onAdapt: () => void }) {
  const [done, setDone] = useState([true,true,true,false,false]);
  if (!open) return <div className="view"><PageTop title="Pass" /><div className="empty-workout"><span>✦</span><h1>Dagens pass är redo.</h1><p>AI-coachen har balanserat volym och intensitet efter din återhämtning.</p><button className="gradient-button" onClick={onStart}>Starta pass</button></div></div>;
  return <div className="view workout-view"><PageTop title="Styrka – Överkropp" back /><Image className="workout-cover" src="/workout-hero.png" width={900} height={506} alt="Muskler som tränas i dagens pass" priority /><div className="workout-meta"><span>◷ 60 min</span><span>◴ 5 övningar</span></div><button className="adapt-chip" onClick={onAdapt}>✦ AI-anpassa passet</button><div className="exercise-list">{exercises.map((e,i)=><button key={e[0]} onClick={()=>setDone(done.map((x,j)=>j===i?!x:x))}><span className="exercise-no">{String(i+1).padStart(2,"0")}</span><span><strong>{e[0]}</strong><small>{e[1]}</small></span><i className={done[i]?"checked":""}>{done[i]?"✓":""}</i></button>)}</div><button className="gradient-button sticky-action">{done.every(Boolean) ? "Slutför pass" : "Fortsätt pass"}</button></div>;
}

function Planner({ plan, loading, onGenerate }: { plan: PlanDay[]; loading: boolean; onGenerate: () => void }) {
  return <div className="view"><PageTop title="Planer" /><div className="segmented"><button className="active">Vecka</button><button>Månad</button></div><div className="calendar-head"><strong>Augusti 2026</strong><span>›</span></div><div className="calendar-row">{["M 10","T 11","O 12","T 13","F 14","L 15","S 16"].map((d,i)=><span className={i===3?"active":""} key={d}>{d.split(" ")[0]}<b>{d.split(" ")[1]}</b></span>)}</div><button className="generate-plan" onClick={onGenerate} disabled={loading}><span>✦</span><span><strong>{loading?"AI bygger din plan…":"Skapa ny plan med AI"}</strong><small>Anpassas efter mål, historik och återhämtning</small></span></button><div className="plan-list">{plan.map((p,i)=><div key={p.day}><span className={`plan-icon ${p.type}`}>{p.type==="run"?"♙":p.type==="recovery"?"◇":"♜"}</span><span><small>{p.day}</small><strong>{p.title}</strong><em>{p.meta}</em></span><i className={i===0?"checked":""}>{i===0?"✓":""}</i></div>)}</div><div className="coach-note"><span>✦</span><p><strong>AI-planering</strong>Planen utvecklas automatiskt när du tränar, vilar eller ändrar mål.</p></div></div>;
}

function Statistics() {
  const metrics = [["Träningspass","4","av 6"],["Kcal förbränt","2 153","+15%"],["Träningstid","4 h 25","+10%"],["Snittpuls","128 bpm","+8%"]];
  return <div className="view"><PageTop title="Statistik" /><div className="stats-tabs"><button className="active">Översikt</button><button>Träning</button><button>Kropp</button></div><div className="period">Denna vecka⌄</div><div className="metric-grid">{metrics.map((m,i)=><div key={m[0]}><small>{m[0]}</small><strong>{m[1]}</strong><em className={i===3?"red":""}>{m[2]}</em>{i<2&&<div className={i===0?"mini-bars":"mini-line"}>{i===0?[30,55,36,62,50,80,64].map((h,j)=><i key={j} style={{height:h}}/>):"⌁⌁⌁⌁"}</div>}</div>)}</div><section className="progress-card"><label>AI-PROGNOS · 8 VECKOR</label><h2>+7,5 kg i bänkpress</h2><p>Om du följer nuvarande plan med minst 85% kontinuitet.</p><div className="forecast-line">⌁⌁⌁⌁⌁</div></section></div>;
}

function Profile({ session, accessToken }: { session: AccountSession; accessToken: string }) {
  const initials = session.name.split(/\s+/).map(part => part[0]).join("").slice(0, 2).toUpperCase();
  const [userCount, setUserCount] = useState<number | null>(null);
  const [pendingInvitations, setPendingInvitations] = useState<number | null>(null);
  const loadUsers = async () => {
    const response = await fetch("/api/admin/users", { headers: { authorization: `Bearer ${accessToken}` } });
    if (!response.ok) return;
    const data = await response.json() as { users: unknown[]; pendingInvitations: number };
    setUserCount(data.users.length);
    setPendingInvitations(data.pendingInvitations);
  };
  return <div className="view"><PageTop title="Profil" /><div className="profile-hero"><span>{initials}</span><h2>{session.name}</h2><small>{session.role === "admin" ? "Administratör" : "Medlem"} · {session.email}</small></div><div className="profile-list"><button><span>◎</span><b>Mål & nivå</b><small>Styrka · 10 km</small><i>›</i></button><button><span>◷</span><b>Tillgänglig tid</b><small>4 pass / vecka</small><i>›</i></button><button><span>♡</span><b>Återhämtning</b><small>Apple Hälsa ansluten</small><i>›</i></button><button><span>✦</span><b>AI-inställningar</b><small>Proaktiv coachning på</small><i>›</i></button>{session.role === "admin" && <button onClick={() => void loadUsers()}><span>⚙</span><b>Administration</b><small>{userCount === null ? "Hantera medlemmar" : `${userCount} medlemmar · ${pendingInvitations ?? 0} väntar`}</small><i>›</i></button>}<button className="profile-signout" onClick={() => void getSupabaseBrowserClient()?.auth.signOut()}>Logga ut</button></div></div>;
}

function CoachSheet({ coach, loading, onClose, onAsk }: { coach: CoachReply; loading: boolean; onClose: () => void; onAsk: (s:string)=>void }) {
  const [text,setText]=useState("");
  return <div className="sheet-backdrop" onMouseDown={onClose}><section className="coach-sheet" onMouseDown={e=>e.stopPropagation()}><div className="sheet-handle"></div><button className="close" onClick={onClose}>×</button><div className="coach-title"><span>✦</span><div><small>TRÄNINGSGENIE AI</small><h2>Din personliga coach</h2></div></div><div className="coach-answer">{loading?<div className="thinking"><i></i><i></i><i></i></div>:<><strong>{coach.title}</strong><p>{coach.summary}</p>{coach.reason&&<small>{coach.reason}</small>}</>}</div><div className="quick-prompts"><button onClick={()=>onAsk("Gör dagens pass 30 minuter")}>Gör passet kortare</button><button onClick={()=>onAsk("Jag känner mig trött idag, anpassa träningen")}>Jag är trött idag</button></div><form onSubmit={e=>{e.preventDefault();if(text.trim()){onAsk(text);setText("")}}}><input value={text} onChange={e=>setText(e.target.value)} placeholder="Fråga din coach…"/><button>↑</button></form><small className="ai-disclaimer">AI-råd ersätter inte medicinsk bedömning.</small></section></div>;
}

function SectionTitle({title,action}:{title:string;action:string}) { return <div className="section-title"><strong>{title}</strong><button>{action}</button></div>; }

function BottomNav({view,setView,session}:{view:View;setView:(v:View)=>void;session:AccountSession}) {
  const items:[[View,string,string],[View,string,string],[View,string,string],[View,string,string],[View,string,string]]=[["hem","◆","Hem"],["pass","♧","Pass"],["statistik","▥","Statistik"],["planer","▣","Planer"],["profil","♙","Profil"]];
  const initials = session.name.split(/\s+/).map(part => part[0]).join("").slice(0, 2).toUpperCase();
  return <nav className="bottom-nav"><div className="nav-brand"><Image src="/training-genie-logo.png" width={52} height={52} alt="" /><span><strong>TRAINING</strong><b>GENIE</b></span></div><div className="nav-links">{items.map(([v,icon,label])=><button className={view===v?"active":""} onClick={()=>setView(v)} key={v}><span>{icon}</span><small>{label}</small></button>)}</div><button className="nav-account" onClick={()=>setView("profil")}><span>{initials}</span><small><strong>{session.name}</strong><em>{session.role === "admin" ? "Administratör" : "Medlem"}</em></small></button></nav>;
}
