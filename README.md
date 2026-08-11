# TräningsGenie

Ett klickbart första utkast till en personlig träningsapp för styrketräning och löpning. Appen innehåller översikt, ett aktivt passflöde, träningshistorik och progressionsvyer.

## Kom igång

```bash
npm install
npm run dev
```

## Inloggning och databas

Appen använder Sign in with ChatGPT och en beständig D1-databas. Konton skapas automatiskt vid första säkra inloggningen. Kontot som matchar `ADMIN_EMAIL` får administratörsrollen; övriga konton får vanlig användarroll.

Databasen lagrar användarprofiler, roller, träningspass, set och träningsplaner. Schemat finns i `db/schema.ts` och den genererade migreringen i `drizzle/`.

Adminåtkomst kontrolleras på serversidan. Ingen lösenordsinformation lagras i appen.

AI-coachen fungerar med demosvar utan konfiguration. Lägg `OPENAI_API_KEY` i en lokal `.env` eller som en säker miljövariabel i den publicerade appen för riktiga AI-svar.

## Kontroll

```bash
npm run build
npm test
```
