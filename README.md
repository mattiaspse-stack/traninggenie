# TräningsGenie

Ett klickbart första utkast till en personlig träningsapp för styrketräning och löpning. Appen innehåller översikt, ett aktivt passflöde, träningshistorik och progressionsvyer.

## Kom igång

```bash
npm install
npm run dev
```

## Supabase

Projektets URL finns i `.env.example`. Lägg projektets publika anon-nyckel i en lokal `.env`:

```text
NEXT_PUBLIC_SUPABASE_URL=https://vecbqzleyfhlbgfsuxyd.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=din-publika-anon-nyckel
```

Databasschemat finns i `supabase/schema.sql` och innehåller Row Level Security så att användare bara får läsa och ändra sin egen data. Kör schemat i Supabase SQL Editor när autentisering och skarp datalagring ska aktiveras.

Den nuvarande versionen är ett UI-utkast med exempeldata. Den skriver ännu inte data till Supabase.

## Kontroll

```bash
npm run build
npm test
```
