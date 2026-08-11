# TräningsGenie

Ett klickbart första utkast till en personlig träningsapp för styrketräning och löpning. Appen innehåller översikt, ett aktivt passflöde, träningshistorik och progressionsvyer.

## Kom igång

```bash
npm install
npm run db:migrate:local
npm run dev
```

## Inloggning och databas

Appen använder Supabase Auth för inloggning med e-post/lösenord, samt en beständig D1-databas för träningsdata och medlemsansökningar. Nya personer använder `Begär inbjudan`; ansökan sparas för administratörens granskning. Kontot som matchar `ADMIN_EMAIL` får administratörsrollen.

Databasen lagrar användarprofiler, roller, träningspass, set och träningsplaner. Schemat finns i `db/schema.ts` och den genererade migreringen i `drizzle/`.

Adminåtkomst och varje API-anrop kontrolleras på serversidan mot Supabase. Ingen lösenordsinformation lagras i appen eller D1-databasen.

Kopiera `.env.example` till `.env` och fyll i Supabase-projektets publishable key innan lokal start.

AI-coachen fungerar med demosvar utan konfiguration. Lägg `OPENAI_API_KEY` i en lokal `.env` eller som en säker miljövariabel i den publicerade appen för riktiga AI-svar.

## Kontroll

```bash
npm run build
npm test
```
