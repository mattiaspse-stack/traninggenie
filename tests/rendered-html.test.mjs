import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("contains the TräningsGenie product experience", async () => {
  const source = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  assert.match(source, /AI-COACHEN/);
  assert.match(source, /Nästa pass/);
  assert.match(source, /Skapa ny plan med AI/);
  assert.match(source, /AI-anpassa passet/);
  assert.match(source, /workout-hero\.png/);
  assert.match(source, /Logga in/);
  assert.match(source, /Begär inbjudan/);
  assert.match(source, /signInWithPassword/);
  assert.doesNotMatch(source, /signUp\(/);
  assert.match(source, /auth-logo/);
  assert.match(source, /Administration/);
  assert.doesNotMatch(source, /codex-preview|react-loading-skeleton/i);
});

test("database migration creates accounts and training data", async () => {
  const migration = await readFile(new URL("../drizzle/0000_famous_white_queen.sql", import.meta.url), "utf8");
  assert.match(migration, /CREATE TABLE `app_users`/);
  assert.match(migration, /CREATE TABLE `workouts`/);
  assert.match(migration, /CREATE TABLE `exercise_sets`/);
  assert.match(migration, /CREATE TABLE `training_plans`/);
});

test("membership requests are stored for admin review", async () => {
  const route = await readFile(new URL("../app/api/invitations/route.ts", import.meta.url), "utf8");
  assert.match(route, /membership_requests/);
  assert.match(route, /status = 'pending'/);
});

test("admin account is explicitly configured", async () => {
  const sessionRoute = await readFile(new URL("../app/api/session/route.ts", import.meta.url), "utf8");
  assert.match(sessionRoute, /info@mattiasp\.se/);
  assert.doesNotMatch(sessionRoute, /EXISTS \(SELECT 1 FROM app_users WHERE role = 'admin'\)/);
});
