import { index, integer, real, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

export const users = sqliteTable("app_users", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  fullName: text("full_name"),
  role: text("role", { enum: ["admin", "user"] }).notNull().default("user"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const membershipRequests = sqliteTable("membership_requests", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  fullName: text("full_name").notNull(),
  message: text("message"),
  status: text("status", { enum: ["pending", "approved", "rejected"] }).notNull().default("pending"),
  requestedAt: text("requested_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  reviewedAt: text("reviewed_at"),
  reviewedBy: text("reviewed_by").references(() => users.id, { onDelete: "set null" }),
}, (table) => [index("idx_membership_requests_status_requested").on(table.status, table.requestedAt)]);

export const workouts = sqliteTable("workouts", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  workoutType: text("workout_type", { enum: ["strength", "run", "recovery"] }).notNull(),
  title: text("title").notNull(),
  startedAt: text("started_at").notNull(),
  finishedAt: text("finished_at"),
  durationMinutes: integer("duration_minutes"),
  distanceKm: real("distance_km"),
  notes: text("notes"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [index("idx_workouts_user_started").on(table.userId, table.startedAt)]);

export const exerciseSets = sqliteTable("exercise_sets", {
  id: text("id").primaryKey(),
  workoutId: text("workout_id").notNull().references(() => workouts.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  exerciseName: text("exercise_name").notNull(),
  setNumber: integer("set_number").notNull(),
  weightKg: real("weight_kg"),
  reps: integer("reps"),
  rpe: real("rpe"),
  completed: integer("completed", { mode: "boolean" }).notNull().default(false),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [index("idx_exercise_sets_workout").on(table.workoutId, table.setNumber)]);

export const trainingPlans = sqliteTable("training_plans", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  planJson: text("plan_json").notNull(),
  active: integer("active", { mode: "boolean" }).notNull().default(true),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [index("idx_training_plans_user_active").on(table.userId, table.active)]);

export const trainingProfiles = sqliteTable("training_profiles", {
  userId: text("user_id").primaryKey().references(() => users.id, { onDelete: "cascade" }),
  modalitiesJson: text("modalities_json").notNull(),
  goalsJson: text("goals_json").notNull(),
  runningLevel: text("running_level", { enum: ["beginner", "intermediate", "advanced", "none"] }).notNull().default("none"),
  strengthLevel: text("strength_level", { enum: ["beginner", "intermediate", "advanced", "none"] }).notNull().default("none"),
  daysPerWeek: integer("days_per_week").notNull(),
  minutesPerSession: integer("minutes_per_session").notNull(),
  equipmentJson: text("equipment_json").notNull(),
  preferredDaysJson: text("preferred_days_json").notNull(),
  currentTraining: text("current_training"),
  limitations: text("limitations"),
  answersJson: text("answers_json").notNull(),
  onboardingComplete: integer("onboarding_complete", { mode: "boolean" }).notNull().default(false),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});
