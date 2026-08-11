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
  assert.match(source, /Logga in med ChatGPT/);
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
