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

// ─── Validation Engine ───────────────────────────────────────────────────────

export const growthArchetypeEnum = pgEnum('growth_archetype', [
  'bootstrapped_cashflow', 'vc_backed_scale', 'lifestyle_business',
  'content_engine', 'acquisition_flip', 'platform_play'
]);

export const sprintStatusEnum = pgEnum('sprint_status', ['planning', 'active', 'completed', 'cancelled']);

export const experimentStepStatusEnum = pgEnum('experiment_step_status', ['pending', 'in_progress', 'completed', 'skipped']);

export const patternCategoryEnum = pgEnum('pattern_category', ['success_pattern', 'failure_pattern', 'market_signal', 'timing_pattern']);

export const signalTrendEnum = pgEnum('signal_trend', ['rising', 'flat', 'falling']);

export const killScaleRecommendationEnum = pgEnum('kill_scale_recommendation', ['scale', 'double_down', 'iterate', 'park', 'kill']);

export const signalStrengthScores = pgTable('signal_strength_scores', {
  id: uuid('id').defaultRandom().primaryKey(),
  projectId: text('project_id').notNull(),
  teamId: uuid('team_id').notNull().references(() => teams.id),
  score: numeric('score', { precision: 5, scale: 2 }).$type<number>().notNull(),
  breakdown: jsonb('breakdown').$type<{
    council_score: number;
    experiment_score: number;
    market_signals: number;
    network_advantage: number;
    revenue_proximity: number;
    enjoyment_score: number;
  }>().notNull(),
  trend: signalTrendEnum('trend').notNull().default('flat'),
  previousScore: numeric('previous_score', { precision: 5, scale: 2 }).$type<number>(),
  daysAtCurrentLevel: integer('days_at_current_level').notNull().default(0),
  recommendation: killScaleRecommendationEnum('recommendation'),
  computedAt: timestamp('computed_at', { withTimezone: true }).notNull().defaultNow(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const enjoymentScores = pgTable('enjoyment_scores', {
  id: uuid('id').defaultRandom().primaryKey(),
  projectId: text('project_id').notNull(),
  teamId: uuid('team_id').notNull().references(() => teams.id),
  score: integer('score').notNull(),
  note: text('note'),
  createdBy: uuid('created_by').references(() => users.id),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const experimentPlans = pgTable('experiment_plans', {
  id: uuid('id').defaultRandom().primaryKey(),
  experimentId: uuid('experiment_id').notNull().references(() => experiments.id),
  steps: jsonb('steps').$type<{
    order: number;
    title: string;
    description: string;
    tool_or_action: string;
    estimated_cost_usd: number;
    estimated_hours: number;
    completion_criteria: string;
  }[]>().default([]),
  budgetUsd: numeric('budget_usd', { precision: 10, scale: 2 }).$type<number>(),
  spentUsd: numeric('spent_usd', { precision: 10, scale: 2 }).$type<number>().default(0),
  sprintStartDate: timestamp('sprint_start_date', { withTimezone: true }),
  sprintEndDate: timestamp('sprint_end_date', { withTimezone: true }),
  sprintDays: integer('sprint_days').notNull().default(14),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const experimentSteps = pgTable('experiment_steps', {
  id: uuid('id').defaultRandom().primaryKey(),
  planId: uuid('plan_id').notNull().references(() => experimentPlans.id),
  orderIndex: integer('order_index').notNull(),
  title: text('title').notNull(),
  description: text('description'),
  toolOrAction: text('tool_or_action'),
  estimatedCostUsd: numeric('estimated_cost_usd', { precision: 10, scale: 2 }).$type<number>(),
  estimatedHours: numeric('estimated_hours', { precision: 5, scale: 1 }).$type<number>(),
  completionCriteria: text('completion_criteria'),
  status: experimentStepStatusEnum('status').notNull().default('pending'),
  result: text('result'),
  completedAt: timestamp('completed_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const validationSprints = pgTable('validation_sprints', {
  id: uuid('id').defaultRandom().primaryKey(),
  teamId: uuid('team_id').notNull().references(() => teams.id),
  name: text('name').notNull(),
  startDate: timestamp('start_date', { withTimezone: true }),
  endDate: timestamp('end_date', { withTimezone: true }),
  totalBudgetUsd: numeric('total_budget_usd', { precision: 10, scale: 2 }).$type<number>(),
  status: sprintStatusEnum('status').notNull().default('planning'),
  results: jsonb('results').$type<{
    rankings: { project_id: string; experiment_id: string; pre_sprint_score: number; post_sprint_score: number; delta: number; recommendation: string }[];
    total_spent_usd: number;
    key_learnings: string[];
    patterns_extracted: string[];
  }>(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const sprintExperiments = pgTable('sprint_experiments', {
  id: uuid('id').defaultRandom().primaryKey(),
  sprintId: uuid('sprint_id').notNull().references(() => validationSprints.id),
  experimentId: uuid('experiment_id').notNull().references(() => experiments.id),
  budgetAllocation: numeric('budget_allocation', { precision: 10, scale: 2 }).$type<number>(),
  rank: integer('rank'),
});

export const patternMemory = pgTable('pattern_memory', {
  id: uuid('id').defaultRandom().primaryKey(),
  teamId: uuid('team_id').notNull().references(() => teams.id),
  projectId: text('project_id'),
  experimentId: uuid('experiment_id').references(() => experiments.id),
  pattern: text('pattern').notNull(),
  category: patternCategoryEnum('category').notNull(),
  tags: text('tags').array(),
  confidence: numeric('confidence', { precision: 3, scale: 2 }).$type<number>(),
  appliesTo: text('applies_to').array(),
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
