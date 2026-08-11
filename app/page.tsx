"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { getSupabaseBrowserClient } from "./supabase";

type View = "hem" | "pass" | "statistik" | "planer" | "profil";
type AccountSession = { id: string; email: string; name: string; role: "admin" | "user" };
type CoachReply = { title?: string; summary: string; reason?: string; plan?: PlanDay[]; source?: string };
type PlanDay = { day: string; title: string; meta: string; type: "strength" | "run" | "recovery" };

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

  return (
    <main className="stage">
      <section className="phone-app">
        <header className="statusbar"><span>9:41</span><span className="brand-mini">TG</span><span>● ◒ ▰</span></header>
        <div className="screen">
          {view === "hem" && <Dashboard coach={coach} loading={loading} onCoach={() => setCoachOpen(true)} onStart={() => { setSessionOpen(true); setView("pass"); }} />}
          {view === "pass" && <Workout open={sessionOpen} onStart={() => setSessionOpen(true)} onAdapt={() => { setCoachOpen(true); void askAI("adapt"); }} />}
          {view === "statistik" && <Statistics />}
          {view === "planer" && <Planner plan={plan} loading={loading} onGenerate={() => void askAI("plan")} />}
          {view === "profil" && <Profile session={session} accessToken={accessToken ?? ""} />}
        </div>
        <BottomNav view={view} setView={setView} />
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

function BottomNav({view,setView}:{view:View;setView:(v:View)=>void}) {
  const items:[[View,string,string],[View,string,string],[View,string,string],[View,string,string],[View,string,string]]=[["hem","◆","Hem"],["pass","♧","Pass"],["statistik","▥","Statistik"],["planer","▣","Planer"],["profil","♙","Profil"]];
  return <nav className="bottom-nav">{items.map(([v,icon,label])=><button className={view===v?"active":""} onClick={()=>setView(v)} key={v}><span>{icon}</span><small>{label}</small></button>)}</nav>;
}
