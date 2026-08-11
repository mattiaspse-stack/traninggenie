-- Kör detta i Supabase SQL Editor när autentiseringen ska aktiveras.
create table if not exists public.workouts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  workout_type text not null check (workout_type in ('strength', 'run')),
  title text not null,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  duration_minutes integer,
  distance_km numeric(7,2),
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.exercise_sets (
  id uuid primary key default gen_random_uuid(),
  workout_id uuid not null references public.workouts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  exercise_name text not null,
  set_number integer not null,
  weight_kg numeric(7,2),
  reps integer,
  rpe numeric(3,1),
  completed boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.workouts enable row level security;
alter table public.exercise_sets enable row level security;

create policy "Users manage own workouts" on public.workouts
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users manage own exercise sets" on public.exercise_sets
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index if not exists workouts_user_started_idx on public.workouts(user_id, started_at desc);
create index if not exists exercise_sets_workout_idx on public.exercise_sets(workout_id, set_number);
