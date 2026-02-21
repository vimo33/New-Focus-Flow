import { pool, db } from './connection';
import { sql } from 'drizzle-orm';
import * as schema from './schema';

/**
 * Push schema to database (creates tables if not exist).
 * For production, use drizzle-kit migrations instead.
 */
async function migrate() {
  console.log('[DB] Starting schema migration...');

  try {
    // Create enum types first (Drizzle push handles this, but we ensure idempotency)
    const enumStatements = [
      `DO $$ BEGIN CREATE TYPE project_status AS ENUM ('idea', 'active', 'parked', 'killed'); EXCEPTION WHEN duplicate_object THEN null; END $$`,
      `DO $$ BEGIN CREATE TYPE project_stage AS ENUM ('idea', 'validation', 'mvp', 'growth', 'scale', 'exit'); EXCEPTION WHEN duplicate_object THEN null; END $$`,
      `DO $$ BEGIN CREATE TYPE autonomy_level AS ENUM ('manual', 'assisted', 'auto'); EXCEPTION WHEN duplicate_object THEN null; END $$`,
      `DO $$ BEGIN CREATE TYPE hypothesis_type AS ENUM ('problem', 'solution', 'channel', 'pricing', 'moat'); EXCEPTION WHEN duplicate_object THEN null; END $$`,
      `DO $$ BEGIN CREATE TYPE experiment_status AS ENUM ('draft', 'running', 'paused', 'completed'); EXCEPTION WHEN duplicate_object THEN null; END $$`,
      `DO $$ BEGIN CREATE TYPE decision_action AS ENUM ('scale', 'iterate', 'pivot', 'park', 'kill'); EXCEPTION WHEN duplicate_object THEN null; END $$`,
      `DO $$ BEGIN CREATE TYPE agent_run_status AS ENUM ('queued', 'running', 'completed', 'failed', 'cancelled'); EXCEPTION WHEN duplicate_object THEN null; END $$`,
      `DO $$ BEGIN CREATE TYPE agent_run_mode AS ENUM ('think', 'validate', 'build', 'grow', 'leverage'); EXCEPTION WHEN duplicate_object THEN null; END $$`,
      `DO $$ BEGIN CREATE TYPE approval_status AS ENUM ('pending', 'approved', 'rejected', 'expired'); EXCEPTION WHEN duplicate_object THEN null; END $$`,
      `DO $$ BEGIN CREATE TYPE risk_tier AS ENUM ('tier1', 'tier2', 'tier3'); EXCEPTION WHEN duplicate_object THEN null; END $$`,
      `DO $$ BEGIN CREATE TYPE team_role AS ENUM ('owner', 'admin', 'member', 'viewer'); EXCEPTION WHEN duplicate_object THEN null; END $$`,
      `DO $$ BEGIN CREATE TYPE user_role AS ENUM ('admin', 'user'); EXCEPTION WHEN duplicate_object THEN null; END $$`,
      `DO $$ BEGIN CREATE TYPE memory_item_type AS ENUM ('note', 'report', 'transcript', 'decision', 'playbook'); EXCEPTION WHEN duplicate_object THEN null; END $$`,
    ];

    for (const stmt of enumStatements) {
      await db.execute(sql.raw(stmt));
    }

    // Create tables
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email TEXT NOT NULL UNIQUE,
        name TEXT NOT NULL,
        password_hash TEXT NOT NULL,
        avatar_url TEXT,
        role user_role NOT NULL DEFAULT 'user',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS teams (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT NOT NULL,
        owner_id UUID NOT NULL REFERENCES users(id),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS team_members (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        team_id UUID NOT NULL REFERENCES teams(id),
        user_id UUID NOT NULL REFERENCES users(id),
        role team_role NOT NULL DEFAULT 'member',
        joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS sessions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id),
        token TEXT NOT NULL UNIQUE,
        expires_at TIMESTAMPTZ NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS projects (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        team_id UUID NOT NULL REFERENCES teams(id),
        name TEXT NOT NULL,
        description TEXT,
        status project_status NOT NULL DEFAULT 'idea',
        stage project_stage NOT NULL DEFAULT 'idea',
        autonomy_level autonomy_level NOT NULL DEFAULT 'assisted',
        goals_json JSONB,
        constraints_json JSONB,
        tags TEXT[],
        created_by UUID REFERENCES users(id),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS ideas (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        team_id UUID NOT NULL REFERENCES teams(id),
        name TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'inbox',
        problem_statement TEXT,
        icp TEXT,
        constraints_json JSONB,
        revenue_model TEXT,
        created_by UUID REFERENCES users(id),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS hypotheses (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        project_id UUID NOT NULL REFERENCES projects(id),
        statement TEXT NOT NULL,
        type hypothesis_type NOT NULL,
        confidence NUMERIC(3,2),
        evidence_refs_json JSONB DEFAULT '[]',
        owner_agent TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS experiments (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        project_id UUID NOT NULL REFERENCES projects(id),
        hypothesis_id UUID REFERENCES hypotheses(id),
        metric_name TEXT NOT NULL,
        metric_definition TEXT,
        success_rule TEXT NOT NULL,
        status experiment_status NOT NULL DEFAULT 'draft',
        results_json JSONB,
        decision decision_action,
        decision_rationale TEXT,
        start_at TIMESTAMPTZ,
        end_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS signals (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        project_id UUID NOT NULL REFERENCES projects(id),
        experiment_id UUID REFERENCES experiments(id),
        type TEXT NOT NULL,
        value_json JSONB,
        source TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS decisions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        project_id UUID NOT NULL REFERENCES projects(id),
        experiment_id UUID REFERENCES experiments(id),
        action decision_action NOT NULL,
        rationale TEXT NOT NULL,
        evidence_json JSONB DEFAULT '[]',
        assumptions_json JSONB DEFAULT '[]',
        confidence NUMERIC(3,2),
        counterarguments_json JSONB DEFAULT '[]',
        created_by UUID REFERENCES users(id),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS agent_runs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        project_id UUID REFERENCES projects(id),
        team_id UUID NOT NULL REFERENCES teams(id),
        mode agent_run_mode NOT NULL,
        agents_json JSONB DEFAULT '[]',
        tools_used_json JSONB DEFAULT '[]',
        status agent_run_status NOT NULL DEFAULT 'queued',
        started_at TIMESTAMPTZ,
        ended_at TIMESTAMPTZ,
        outputs_json JSONB DEFAULT '[]',
        approvals_json JSONB DEFAULT '[]',
        cost_usd NUMERIC(10,4),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS playbooks (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        project_id UUID REFERENCES projects(id),
        team_id UUID NOT NULL REFERENCES teams(id),
        title TEXT NOT NULL,
        context TEXT,
        steps_json JSONB DEFAULT '[]',
        success_metrics_json JSONB DEFAULT '[]',
        failure_modes_json JSONB DEFAULT '[]',
        source_experiment_id UUID REFERENCES experiments(id),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS memory_items (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        team_id UUID NOT NULL REFERENCES teams(id),
        project_id UUID REFERENCES projects(id),
        type memory_item_type NOT NULL,
        title TEXT NOT NULL,
        content_ref TEXT,
        embedding_ref TEXT,
        source TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS approvals (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        team_id UUID NOT NULL REFERENCES teams(id),
        agent_run_id UUID REFERENCES agent_runs(id),
        action_summary TEXT NOT NULL,
        risk_tier risk_tier NOT NULL,
        evidence TEXT,
        status approval_status NOT NULL DEFAULT 'pending',
        decided_by UUID REFERENCES users(id),
        decided_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS audit_log (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        team_id UUID REFERENCES teams(id),
        user_id UUID REFERENCES users(id),
        agent_name TEXT,
        action TEXT NOT NULL,
        resource_type TEXT,
        resource_id TEXT,
        details_json JSONB,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    // ─── Validation Engine Tables ───────────────────────────────────────────

    // Enums for validation engine
    const validationEnumStatements = [
      `DO $$ BEGIN CREATE TYPE growth_archetype AS ENUM ('bootstrapped_cashflow', 'vc_backed_scale', 'lifestyle_business', 'content_engine', 'acquisition_flip', 'platform_play'); EXCEPTION WHEN duplicate_object THEN null; END $$`,
      `DO $$ BEGIN CREATE TYPE sprint_status AS ENUM ('planning', 'active', 'completed', 'cancelled'); EXCEPTION WHEN duplicate_object THEN null; END $$`,
      `DO $$ BEGIN CREATE TYPE experiment_step_status AS ENUM ('pending', 'in_progress', 'completed', 'skipped'); EXCEPTION WHEN duplicate_object THEN null; END $$`,
      `DO $$ BEGIN CREATE TYPE pattern_category AS ENUM ('success_pattern', 'failure_pattern', 'market_signal', 'timing_pattern'); EXCEPTION WHEN duplicate_object THEN null; END $$`,
      `DO $$ BEGIN CREATE TYPE signal_trend AS ENUM ('rising', 'flat', 'falling'); EXCEPTION WHEN duplicate_object THEN null; END $$`,
      `DO $$ BEGIN CREATE TYPE kill_scale_recommendation AS ENUM ('scale', 'double_down', 'iterate', 'park', 'kill'); EXCEPTION WHEN duplicate_object THEN null; END $$`,
    ];

    for (const stmt of validationEnumStatements) {
      await db.execute(sql.raw(stmt));
    }

    // Add growth_archetype column to projects (nullable)
    await db.execute(sql`
      DO $$ BEGIN
        ALTER TABLE projects ADD COLUMN growth_archetype growth_archetype;
      EXCEPTION WHEN duplicate_column THEN null;
      END $$
    `);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS signal_strength_scores (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        project_id TEXT NOT NULL,
        team_id UUID NOT NULL REFERENCES teams(id),
        score NUMERIC(5,2) NOT NULL,
        breakdown JSONB NOT NULL,
        trend signal_trend NOT NULL DEFAULT 'flat',
        previous_score NUMERIC(5,2),
        days_at_current_level INTEGER NOT NULL DEFAULT 0,
        recommendation kill_scale_recommendation,
        computed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS enjoyment_scores (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        project_id TEXT NOT NULL,
        team_id UUID NOT NULL REFERENCES teams(id),
        score INTEGER NOT NULL CHECK (score >= 1 AND score <= 5),
        note TEXT,
        created_by UUID REFERENCES users(id),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS experiment_plans (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        experiment_id UUID NOT NULL REFERENCES experiments(id),
        steps JSONB DEFAULT '[]',
        budget_usd NUMERIC(10,2),
        spent_usd NUMERIC(10,2) DEFAULT 0,
        sprint_start_date TIMESTAMPTZ,
        sprint_end_date TIMESTAMPTZ,
        sprint_days INTEGER NOT NULL DEFAULT 14,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS experiment_steps (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        plan_id UUID NOT NULL REFERENCES experiment_plans(id),
        order_index INTEGER NOT NULL,
        title TEXT NOT NULL,
        description TEXT,
        tool_or_action TEXT,
        estimated_cost_usd NUMERIC(10,2),
        estimated_hours NUMERIC(5,1),
        completion_criteria TEXT,
        status experiment_step_status NOT NULL DEFAULT 'pending',
        result TEXT,
        completed_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS validation_sprints (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        team_id UUID NOT NULL REFERENCES teams(id),
        name TEXT NOT NULL,
        start_date TIMESTAMPTZ,
        end_date TIMESTAMPTZ,
        total_budget_usd NUMERIC(10,2),
        status sprint_status NOT NULL DEFAULT 'planning',
        results JSONB,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS sprint_experiments (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        sprint_id UUID NOT NULL REFERENCES validation_sprints(id),
        experiment_id UUID NOT NULL REFERENCES experiments(id),
        budget_allocation NUMERIC(10,2),
        rank INTEGER
      )
    `);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS pattern_memory (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        team_id UUID NOT NULL REFERENCES teams(id),
        project_id TEXT,
        experiment_id UUID REFERENCES experiments(id),
        pattern TEXT NOT NULL,
        category pattern_category NOT NULL,
        tags TEXT[],
        confidence NUMERIC(3,2),
        applies_to TEXT[],
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    // Create indexes
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_projects_team ON projects(team_id)`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status)`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_hypotheses_project ON hypotheses(project_id)`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_experiments_project ON experiments(project_id)`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_experiments_status ON experiments(status)`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_decisions_project ON decisions(project_id)`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_agent_runs_team ON agent_runs(team_id)`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_agent_runs_status ON agent_runs(status)`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_approvals_team ON approvals(team_id)`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_approvals_status ON approvals(status)`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_audit_log_team ON audit_log(team_id)`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token)`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id)`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_team_members_team ON team_members(team_id)`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_team_members_user ON team_members(user_id)`);

    // Validation engine indexes
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_signal_scores_project ON signal_strength_scores(project_id)`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_signal_scores_team ON signal_strength_scores(team_id)`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_signal_scores_computed ON signal_strength_scores(computed_at DESC)`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_enjoyment_project ON enjoyment_scores(project_id)`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_enjoyment_team ON enjoyment_scores(team_id)`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_experiment_plans_experiment ON experiment_plans(experiment_id)`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_experiment_steps_plan ON experiment_steps(plan_id)`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_validation_sprints_team ON validation_sprints(team_id)`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_sprint_experiments_sprint ON sprint_experiments(sprint_id)`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_pattern_memory_team ON pattern_memory(team_id)`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_pattern_memory_project ON pattern_memory(project_id)`);

    // Fix: project_id columns must be TEXT not UUID — vault projects use string IDs
    await db.execute(sql`
      ALTER TABLE signal_strength_scores
        ALTER COLUMN project_id DROP DEFAULT,
        ALTER COLUMN project_id TYPE TEXT USING project_id::TEXT,
        DROP CONSTRAINT IF EXISTS signal_strength_scores_project_id_projects_id_fk
    `).catch(() => { /* already text */ });

    await db.execute(sql`
      ALTER TABLE enjoyment_scores
        ALTER COLUMN project_id DROP DEFAULT,
        ALTER COLUMN project_id TYPE TEXT USING project_id::TEXT,
        DROP CONSTRAINT IF EXISTS enjoyment_scores_project_id_projects_id_fk
    `).catch(() => { /* already text */ });

    await db.execute(sql`
      ALTER TABLE pattern_memory
        ALTER COLUMN project_id TYPE TEXT USING project_id::TEXT,
        DROP CONSTRAINT IF EXISTS pattern_memory_project_id_projects_id_fk
    `).catch(() => { /* already text */ });

    console.log('[DB] Schema migration complete — all tables created.');
  } catch (error) {
    console.error('[DB] Migration failed:', error);
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  migrate().then(() => {
    console.log('[DB] Migration finished successfully.');
    process.exit(0);
  }).catch((err) => {
    console.error('[DB] Migration failed:', err);
    process.exit(1);
  });
}

export { migrate };
