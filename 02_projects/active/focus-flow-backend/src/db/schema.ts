import { pgTable, uuid, text, timestamp, integer, numeric, jsonb, boolean, pgEnum } from 'drizzle-orm/pg-core';

// Enums
export const projectStatusEnum = pgEnum('project_status', ['idea', 'active', 'parked', 'killed']);
export const projectStageEnum = pgEnum('project_stage', ['idea', 'validation', 'mvp', 'growth', 'scale', 'exit']);
export const autonomyLevelEnum = pgEnum('autonomy_level', ['manual', 'assisted', 'auto']);
export const hypothesisTypeEnum = pgEnum('hypothesis_type', ['problem', 'solution', 'channel', 'pricing', 'moat']);
export const experimentStatusEnum = pgEnum('experiment_status', ['draft', 'running', 'paused', 'completed']);
export const decisionActionEnum = pgEnum('decision_action', ['scale', 'iterate', 'pivot', 'park', 'kill']);
export const agentRunStatusEnum = pgEnum('agent_run_status', ['queued', 'running', 'completed', 'failed', 'cancelled']);
export const agentRunModeEnum = pgEnum('agent_run_mode', ['think', 'validate', 'build', 'grow', 'leverage']);
export const approvalStatusEnum = pgEnum('approval_status', ['pending', 'approved', 'rejected', 'expired']);
export const riskTierEnum = pgEnum('risk_tier', ['tier1', 'tier2', 'tier3']);
export const teamRoleEnum = pgEnum('team_role', ['owner', 'admin', 'member', 'viewer']);
export const userRoleEnum = pgEnum('user_role', ['admin', 'user']);
export const memoryItemTypeEnum = pgEnum('memory_item_type', ['note', 'report', 'transcript', 'decision', 'playbook']);

// ─── Users & Teams ────────────────────────────────────────────────────────────

export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  email: text('email').notNull().unique(),
  name: text('name').notNull(),
  passwordHash: text('password_hash').notNull(),
  avatarUrl: text('avatar_url'),
  role: userRoleEnum('role').notNull().default('user'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const teams = pgTable('teams', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  ownerId: uuid('owner_id').notNull().references(() => users.id),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const teamMembers = pgTable('team_members', {
  id: uuid('id').defaultRandom().primaryKey(),
  teamId: uuid('team_id').notNull().references(() => teams.id),
  userId: uuid('user_id').notNull().references(() => users.id),
  role: teamRoleEnum('role').notNull().default('member'),
  joinedAt: timestamp('joined_at', { withTimezone: true }).notNull().defaultNow(),
});

export const sessions = pgTable('sessions', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id),
  token: text('token').notNull().unique(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// ─── Portfolio ────────────────────────────────────────────────────────────────

export const projects = pgTable('projects', {
  id: uuid('id').defaultRandom().primaryKey(),
  teamId: uuid('team_id').notNull().references(() => teams.id),
  name: text('name').notNull(),
  description: text('description'),
  status: projectStatusEnum('status').notNull().default('idea'),
  stage: projectStageEnum('stage').notNull().default('idea'),
  autonomyLevel: autonomyLevelEnum('autonomy_level').notNull().default('assisted'),
  goalsJson: jsonb('goals_json').$type<{
    primary_kpi?: string;
    target?: string;
    deadline?: string;
  }>(),
  constraintsJson: jsonb('constraints_json').$type<{
    budget_usd_per_day?: number;
    founder_hours_per_week?: number;
    risk_tolerance?: string;
  }>(),
  tags: text('tags').array(),
  createdBy: uuid('created_by').references(() => users.id),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const ideas = pgTable('ideas', {
  id: uuid('id').defaultRandom().primaryKey(),
  teamId: uuid('team_id').notNull().references(() => teams.id),
  name: text('name').notNull(),
  status: text('status').notNull().default('inbox'),
  problemStatement: text('problem_statement'),
  icp: text('icp'),
  constraintsJson: jsonb('constraints_json'),
  revenueModel: text('revenue_model'),
  createdBy: uuid('created_by').references(() => users.id),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// ─── Experiment System ────────────────────────────────────────────────────────

export const hypotheses = pgTable('hypotheses', {
  id: uuid('id').defaultRandom().primaryKey(),
  projectId: uuid('project_id').notNull().references(() => projects.id),
  statement: text('statement').notNull(),
  type: hypothesisTypeEnum('type').notNull(),
  confidence: numeric('confidence', { precision: 3, scale: 2 }).$type<number>(),
  evidenceRefsJson: jsonb('evidence_refs_json').$type<string[]>().default([]),
  ownerAgent: text('owner_agent'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const experiments = pgTable('experiments', {
  id: uuid('id').defaultRandom().primaryKey(),
  projectId: uuid('project_id').notNull().references(() => projects.id),
  hypothesisId: uuid('hypothesis_id').references(() => hypotheses.id),
  metricName: text('metric_name').notNull(),
  metricDefinition: text('metric_definition'),
  successRule: text('success_rule').notNull(),
  status: experimentStatusEnum('status').notNull().default('draft'),
  resultsJson: jsonb('results_json').$type<{
    baseline?: number;
    variant?: number;
    lift?: number;
    p_value?: number;
    sample_size?: number;
    confidence_interval?: [number, number];
  }>(),
  decision: decisionActionEnum('decision'),
  decisionRationale: text('decision_rationale'),
  startAt: timestamp('start_at', { withTimezone: true }),
  endAt: timestamp('end_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const signals = pgTable('signals', {
  id: uuid('id').defaultRandom().primaryKey(),
  projectId: uuid('project_id').notNull().references(() => projects.id),
  experimentId: uuid('experiment_id').references(() => experiments.id),
  type: text('type').notNull(),
  valueJson: jsonb('value_json'),
  source: text('source'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const decisions = pgTable('decisions', {
  id: uuid('id').defaultRandom().primaryKey(),
  projectId: uuid('project_id').notNull().references(() => projects.id),
  experimentId: uuid('experiment_id').references(() => experiments.id),
  action: decisionActionEnum('action').notNull(),
  rationale: text('rationale').notNull(),
  evidenceJson: jsonb('evidence_json').$type<string[]>().default([]),
  assumptionsJson: jsonb('assumptions_json').$type<string[]>().default([]),
  confidence: numeric('confidence', { precision: 3, scale: 2 }).$type<number>(),
  counterargumentsJson: jsonb('counterarguments_json').$type<string[]>().default([]),
  createdBy: uuid('created_by').references(() => users.id),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// ─── Execution ────────────────────────────────────────────────────────────────

export const agentRuns = pgTable('agent_runs', {
  id: uuid('id').defaultRandom().primaryKey(),
  projectId: uuid('project_id').references(() => projects.id),
  teamId: uuid('team_id').notNull().references(() => teams.id),
  mode: agentRunModeEnum('mode').notNull(),
  agentsJson: jsonb('agents_json').$type<string[]>().default([]),
  toolsUsedJson: jsonb('tools_used_json').$type<string[]>().default([]),
  status: agentRunStatusEnum('status').notNull().default('queued'),
  startedAt: timestamp('started_at', { withTimezone: true }),
  endedAt: timestamp('ended_at', { withTimezone: true }),
  outputsJson: jsonb('outputs_json').$type<{ type: string; path: string }[]>().default([]),
  approvalsJson: jsonb('approvals_json').$type<string[]>().default([]),
  costUsd: numeric('cost_usd', { precision: 10, scale: 4 }).$type<number>(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const playbooks = pgTable('playbooks', {
  id: uuid('id').defaultRandom().primaryKey(),
  projectId: uuid('project_id').references(() => projects.id),
  teamId: uuid('team_id').notNull().references(() => teams.id),
  title: text('title').notNull(),
  context: text('context'),
  stepsJson: jsonb('steps_json').$type<{ order: number; action: string; details: string }[]>().default([]),
  successMetricsJson: jsonb('success_metrics_json').$type<string[]>().default([]),
  failureModesJson: jsonb('failure_modes_json').$type<string[]>().default([]),
  sourceExperimentId: uuid('source_experiment_id').references(() => experiments.id),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// ─── Memory ───────────────────────────────────────────────────────────────────

export const memoryItems = pgTable('memory_items', {
  id: uuid('id').defaultRandom().primaryKey(),
  teamId: uuid('team_id').notNull().references(() => teams.id),
  projectId: uuid('project_id').references(() => projects.id),
  type: memoryItemTypeEnum('type').notNull(),
  title: text('title').notNull(),
  contentRef: text('content_ref'),
  embeddingRef: text('embedding_ref'),
  source: text('source'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// ─── Approvals ────────────────────────────────────────────────────────────────

export const approvals = pgTable('approvals', {
  id: uuid('id').defaultRandom().primaryKey(),
  teamId: uuid('team_id').notNull().references(() => teams.id),
  agentRunId: uuid('agent_run_id').references(() => agentRuns.id),
  actionSummary: text('action_summary').notNull(),
  riskTier: riskTierEnum('risk_tier').notNull(),
  evidence: text('evidence'),
  status: approvalStatusEnum('status').notNull().default('pending'),
  decidedBy: uuid('decided_by').references(() => users.id),
  decidedAt: timestamp('decided_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// ─── Audit Log ────────────────────────────────────────────────────────────────

export const auditLog = pgTable('audit_log', {
  id: uuid('id').defaultRandom().primaryKey(),
  teamId: uuid('team_id').references(() => teams.id),
  userId: uuid('user_id').references(() => users.id),
  agentName: text('agent_name'),
  action: text('action').notNull(),
  resourceType: text('resource_type'),
  resourceId: text('resource_id'),
  detailsJson: jsonb('details_json'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});
