"use client";

import { useMemo, useState } from "react";

type View = "hem" | "pass" | "utveckling";

const week = [
  { day: "M", date: "10", done: true },
  { day: "T", date: "11", current: true },
  { day: "O", date: "12" },
  { day: "T", date: "13" },
  { day: "F", date: "14" },
  { day: "L", date: "15" },
  { day: "S", date: "16" },
];

const activity = [
  { type: "Styrka", title: "Överkropp A", meta: "46 min · 12 set", value: "+8%", date: "Igår", tone: "lime" },
  { type: "Löpning", title: "Lugn distans", meta: "6,4 km · 35:12", value: "5:30 /km", date: "8 aug", tone: "blue" },
  { type: "Styrka", title: "Underkropp A", meta: "52 min · 15 set", value: "3 rekord", date: "6 aug", tone: "orange" },
];

export default function Home() {
  const [view, setView] = useState<View>("hem");
  const [sessionOpen, setSessionOpen] = useState(false);
  const [sets, setSets] = useState([
    { kg: 72.5, reps: 8, done: true },
    { kg: 72.5, reps: 8, done: true },
    { kg: 72.5, reps: 8, done: false },
  ]);
  const [finished, setFinished] = useState(false);

  const completedSets = useMemo(() => sets.filter((set) => set.done).length, [sets]);

  const startSession = () => {
    setFinished(false);
    setSessionOpen(true);
    setView("pass");
  };

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <button className="brand" onClick={() => setView("hem")} aria-label="TräningsGenie hem">
          <img src="/traningsgenie-brand-v2.png" alt="TräningsGenie" />
        </button>

        <nav className="side-nav" aria-label="Huvudmeny">
          <NavButton active={view === "hem"} label="Översikt" symbol="⌂" onClick={() => setView("hem")} />
          <NavButton active={view === "pass"} label="Träningspass" symbol="＋" onClick={() => setView("pass")} />
          <NavButton active={view === "utveckling"} label="Utveckling" symbol="↗" onClick={() => setView("utveckling")} />
        </nav>

        <div className="sidebar-goal">
          <div className="goal-ring"><span>3</span><small>/ 4</small></div>
          <div><strong>Veckans mål</strong><p>Ett pass kvar. Du har det.</p></div>
        </div>

        <button className="profile-button">
          <span className="avatar">MP</span>
          <span><strong>Mattias</strong><small>Min profil</small></span>
          <span className="more">•••</span>
        </button>
      </aside>

      <section className="content">
        <header className="topbar">
          <button className="mobile-brand" onClick={() => setView("hem")} aria-label="TräningsGenie hem">
            <span className="brand-mark">TG</span><span className="mobile-wordmark">TRÄNINGS<span>GENIE</span></span>
          </button>
          <div className="date-label">Tisdag 11 augusti</div>
          <button className="avatar avatar-mobile" aria-label="Öppna profil">MP</button>
        </header>

        {view === "hem" && <Dashboard onStart={startSession} />}
        {view === "pass" && (
          <WorkoutView
            open={sessionOpen}
            finished={finished}
            sets={sets}
            completedSets={completedSets}
            onStart={startSession}
            onToggle={(index) => setSets(sets.map((set, i) => i === index ? { ...set, done: !set.done } : set))}
            onAdd={() => setSets([...sets, { kg: 72.5, reps: 8, done: false }])}
            onFinish={() => setFinished(true)}
          />
        )}
        {view === "utveckling" && <ProgressView />}
      </section>

      <nav className="bottom-nav" aria-label="Mobilmeny">
        <NavButton active={view === "hem"} label="Översikt" symbol="⌂" onClick={() => setView("hem")} />
        <NavButton active={view === "pass"} label="Pass" symbol="＋" onClick={() => setView("pass")} />
        <NavButton active={view === "utveckling"} label="Utveckling" symbol="↗" onClick={() => setView("utveckling")} />
      </nav>
    </main>
  );
}

function NavButton({ active, label, symbol, onClick }: { active: boolean; label: string; symbol: string; onClick: () => void }) {
  return <button className={active ? "active" : ""} onClick={onClick}><span className="nav-symbol">{symbol}</span><span>{label}</span></button>;
}

function Dashboard({ onStart }: { onStart: () => void }) {
  return (
    <div className="page dashboard-page">
      <section className="hero-grid">
        <div className="hero-copy">
          <span className="eyebrow">DIN TRÄNING · DIN UTVECKLING</span>
          <h1>God morgon,<br /><em>Mattias.</em></h1>
          <p>Du är inne på din tredje aktiva vecka. Fortsätt bygga – ett pass i taget.</p>
          <button className="primary-button" onClick={onStart}><span>＋</span> Starta träningspass</button>
        </div>

        <div className="today-card">
          <div className="today-header"><span>IDAG</span><span className="status-dot">Planerat</span></div>
          <div className="workout-icon"><span></span><span></span><span></span></div>
          <h2>Överkropp B</h2>
          <p>6 övningar · cirka 50 min</p>
          <div className="exercise-preview">
            <div><span>01</span><strong>Bänkpress</strong><small>3 × 8</small></div>
            <div><span>02</span><strong>Sittande rodd</strong><small>3 × 10</small></div>
            <div><span>03</span><strong>Axelpress</strong><small>3 × 8</small></div>
          </div>
          <button className="card-action" onClick={onStart}>Öppna passet <span>→</span></button>
        </div>
      </section>

      <section className="week-strip">
        <div><span className="section-kicker">DEN HÄR VECKAN</span><strong>3 av 4 pass klara</strong></div>
        <div className="days">
          {week.map((item, index) => (
            <div className={`day ${item.done ? "done" : ""} ${item.current ? "current" : ""}`} key={index}>
              <span>{item.day}</span><strong>{item.done ? "✓" : item.date}</strong>
            </div>
          ))}
        </div>
      </section>

      <section className="stats-grid">
        <Metric label="PASS I AUGUSTI" value="7" detail="↑ 2 från juli" accent="lime" />
        <Metric label="TRÄNINGSTID" value="5h 42m" detail="Den här månaden" accent="cream" />
        <Metric label="TOTAL DISTANS" value="24,8 km" detail="↑ 12% mot juli" accent="blue" />
        <Metric label="AKTIV SVIT" value="3 veckor" detail="Personligt rekord: 6" accent="orange" />
      </section>

      <section className="lower-grid">
        <div className="panel activity-panel">
          <div className="panel-heading"><div><span className="section-kicker">SENASTE</span><h2>Din aktivitet</h2></div><button>Visa alla →</button></div>
          <div className="activity-list">
            {activity.map((item) => (
              <button className="activity-row" key={item.title}>
                <span className={`activity-icon ${item.tone}`}>{item.type === "Löpning" ? "RUN" : "GYM"}</span>
                <span className="activity-main"><small>{item.type} · {item.date}</small><strong>{item.title}</strong><span>{item.meta}</span></span>
                <span className="activity-value">{item.value}<small>›</small></span>
              </button>
            ))}
          </div>
        </div>

        <div className="panel progress-panel">
          <div className="panel-heading"><div><span className="section-kicker">PROGRESSION</span><h2>Bänkpress</h2></div><button>12 veckor⌄</button></div>
          <div className="chart-summary"><strong>82,5 <small>kg</small></strong><span>+7,5 kg</span></div>
          <div className="mini-chart" aria-label="Bänkpressutveckling från 75 till 82,5 kilogram">
            {[18, 24, 30, 34, 42, 40, 52, 60, 66, 73, 79, 88].map((height, index) => <i key={index} style={{ height: `${height}%` }} className={index === 11 ? "last" : ""}></i>)}
          </div>
          <div className="chart-axis"><span>20 maj</span><span>17 juni</span><span>11 aug</span></div>
        </div>
      </section>
    </div>
  );
}

function Metric({ label, value, detail, accent }: { label: string; value: string; detail: string; accent: string }) {
  return <div className={`metric ${accent}`}><span>{label}</span><strong>{value}</strong><small>{detail}</small></div>;
}

function WorkoutView({ open, finished, sets, completedSets, onStart, onToggle, onAdd, onFinish }: { open: boolean; finished: boolean; sets: { kg: number; reps: number; done: boolean }[]; completedSets: number; onStart: () => void; onToggle: (index: number) => void; onAdd: () => void; onFinish: () => void }) {
  if (!open) return (
    <div className="page empty-state">
      <span className="eyebrow">TRÄNINGSPASS</span><h1>Redo när du är.</h1><p>Starta dagens planerade styrkepass eller registrera en löprunda.</p>
      <div className="start-options"><button className="today-card compact" onClick={onStart}><span>STYRKA</span><h2>Överkropp B</h2><p>6 övningar · cirka 50 min</p><strong>Starta →</strong></button><button className="run-option" onClick={onStart}><span>LÖPNING</span><h2>Logga en runda</h2><p>Distans, tid och känsla.</p><strong>Starta →</strong></button></div>
    </div>
  );

  if (finished) return <div className="page completion"><div className="completion-mark">✓</div><span className="eyebrow">PASS SLUTFÖRT</span><h1>Snyggt jobbat.</h1><p>Du genomförde {completedSets} set. Passet är redo att sparas till din historik när Supabase-anslutningen aktiveras.</p><button className="primary-button" onClick={() => location.reload()}>Till översikten</button></div>;

  return (
    <div className="page workout-page">
      <div className="workout-top"><div><span className="eyebrow">PÅGÅENDE · 12:48</span><h1>Överkropp B</h1><p>{completedSets} av {sets.length + 8} set klara</p></div><button className="finish-button" onClick={onFinish}>Avsluta pass</button></div>
      <div className="workout-layout">
        <section className="exercise-card">
          <div className="exercise-title"><span>01</span><div><h2>Bänkpress</h2><p>Bröst · triceps</p></div><button>•••</button></div>
          <div className="previous-result"><span>FÖRRA PASSET</span><strong>72,5 kg × 8</strong></div>
          <div className="set-table">
            <div className="set-head"><span>SET</span><span>KG</span><span>REPS</span><span>KLAR</span></div>
            {sets.map((set, index) => <div className={`set-row ${set.done ? "set-done" : ""}`} key={index}><strong>{index + 1}</strong><button>{set.kg.toString().replace(".", ",")}</button><button>{set.reps}</button><button className="check-button" onClick={() => onToggle(index)}>{set.done ? "✓" : ""}</button></div>)}
          </div>
          <button className="add-set" onClick={onAdd}>＋ Lägg till set</button>
        </section>
        <aside className="up-next"><span className="section-kicker">NÄSTA ÖVNING</span><h2>Sittande rodd</h2><p>3 set × 10 reps</p><button>Nästa →</button><div className="session-note"><span>ANTECKNING</span><textarea aria-label="Anteckning för träningspasset" placeholder="Hur känns passet idag?"></textarea></div></aside>
      </div>
    </div>
  );
}

function ProgressView() {
  return (
    <div className="page progress-page">
      <span className="eyebrow">DIN UTVECKLING</span><div className="progress-heading"><div><h1>Starkare. Snabbare.<br /><em>Vecka för vecka.</em></h1><p>All träning samlad på ett ställe.</p></div><button className="period-button">Senaste 12 veckorna⌄</button></div>
      <section className="progress-feature">
        <div><span className="section-kicker">STYRKA · BÄNKPRESS</span><strong>82,5 <small>kg</small></strong><p>Upp 10% sedan 20 maj</p></div>
        <div className="large-chart">{[16, 21, 27, 35, 33, 45, 48, 57, 63, 72, 78, 91].map((h, i) => <i key={i} style={{ height: `${h}%` }}></i>)}</div>
      </section>
      <section className="achievement-grid"><Metric label="PERSONLIGA REKORD" value="9" detail="3 den här månaden" accent="lime" /><Metric label="SNITTEMPO LÖPNING" value="5:28" detail="−12 sek / km" accent="blue" /><Metric label="TOTAL VOLYM" value="42,6 ton" detail="↑ 8% på 12 veckor" accent="orange" /></section>
    </div>
  );
}
