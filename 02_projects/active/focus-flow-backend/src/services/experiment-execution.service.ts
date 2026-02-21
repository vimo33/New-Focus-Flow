/**
 * Experiment Execution Service — Plan generation & step tracking for experiments.
 *
 * Generates actionable step-by-step plans based on hypothesis type,
 * tracks step completion, budget, and timeline.
 */

import { db } from '../db/connection';
import { eq, and, asc, desc } from 'drizzle-orm';
import * as schema from '../db/schema';
import { audit } from './db.service';

// Plan templates by hypothesis type
const PLAN_TEMPLATES: Record<string, { title: string; description: string; tool_or_action: string; estimated_cost_usd: number; estimated_hours: number; completion_criteria: string }[]> = {
  problem: [
    { title: 'Define target user segment', description: 'Identify 3-5 specific user segments who might have this problem', tool_or_action: 'research', estimated_cost_usd: 0, estimated_hours: 2, completion_criteria: 'Documented user segments with demographics' },
    { title: 'Draft interview script', description: 'Create 8-10 open-ended questions to validate problem existence and severity', tool_or_action: 'document', estimated_cost_usd: 0, estimated_hours: 1, completion_criteria: 'Interview script ready' },
    { title: 'Conduct user interviews', description: 'Interview 5-10 people from target segments about the problem', tool_or_action: 'interview', estimated_cost_usd: 50, estimated_hours: 8, completion_criteria: 'At least 5 interviews completed with notes' },
    { title: 'Create pain-point survey', description: 'Build a survey to quantify problem severity at scale', tool_or_action: 'survey', estimated_cost_usd: 0, estimated_hours: 2, completion_criteria: 'Survey created and distributed' },
    { title: 'Analyze results', description: 'Synthesize interviews and survey data into a validation verdict', tool_or_action: 'analysis', estimated_cost_usd: 0, estimated_hours: 2, completion_criteria: 'Written summary with go/no-go recommendation' },
  ],
  solution: [
    { title: 'Build smoke test landing page', description: 'Create a landing page describing the solution with a signup CTA', tool_or_action: 'build', estimated_cost_usd: 20, estimated_hours: 4, completion_criteria: 'Landing page live with analytics' },
    { title: 'Drive traffic to landing page', description: 'Run small ad test or share in relevant communities', tool_or_action: 'ads', estimated_cost_usd: 100, estimated_hours: 2, completion_criteria: 'At least 200 visitors' },
    { title: 'Measure conversion rate', description: 'Track signups/clicks on CTA vs total visitors', tool_or_action: 'analytics', estimated_cost_usd: 0, estimated_hours: 1, completion_criteria: 'Conversion data collected' },
    { title: 'Build minimal prototype', description: 'Create Wizard of Oz or minimal functional prototype', tool_or_action: 'build', estimated_cost_usd: 0, estimated_hours: 8, completion_criteria: 'Prototype usable by test users' },
    { title: 'User test prototype', description: 'Have 5-10 users try the prototype and give feedback', tool_or_action: 'test', estimated_cost_usd: 0, estimated_hours: 4, completion_criteria: 'Feedback collected from 5+ users' },
    { title: 'Record decision', description: 'Evaluate all evidence and record scale/iterate/pivot/park/kill decision', tool_or_action: 'decide', estimated_cost_usd: 0, estimated_hours: 1, completion_criteria: 'Decision recorded with rationale' },
  ],
  channel: [
    { title: 'Identify 3 candidate channels', description: 'Research which channels your target audience uses most', tool_or_action: 'research', estimated_cost_usd: 0, estimated_hours: 2, completion_criteria: '3 channels identified with audience data' },
    { title: 'Create channel-specific content', description: 'Draft ad copy, posts, or outreach messages for each channel', tool_or_action: 'create', estimated_cost_usd: 0, estimated_hours: 3, completion_criteria: 'Content ready for 3 channels' },
    { title: 'Run small ad test', description: 'Spend $50-100 per channel to test conversion', tool_or_action: 'ads', estimated_cost_usd: 150, estimated_hours: 2, completion_criteria: 'Ads running on all 3 channels' },
    { title: 'Measure CAC per channel', description: 'Calculate customer acquisition cost and conversion rate per channel', tool_or_action: 'analytics', estimated_cost_usd: 0, estimated_hours: 2, completion_criteria: 'CAC and conversion data for each channel' },
    { title: 'Double down on winner', description: 'Identify best channel and allocate more budget', tool_or_action: 'decide', estimated_cost_usd: 0, estimated_hours: 1, completion_criteria: 'Winner selected with scaling plan' },
  ],
  pricing: [
    { title: 'Competitive pricing analysis', description: 'Research pricing of 5-10 competitors/alternatives', tool_or_action: 'research', estimated_cost_usd: 0, estimated_hours: 3, completion_criteria: 'Pricing table of competitors documented' },
    { title: 'Van Westendorp survey', description: 'Survey 20+ potential customers on price sensitivity', tool_or_action: 'survey', estimated_cost_usd: 0, estimated_hours: 3, completion_criteria: 'Survey completed with 20+ responses' },
    { title: 'Define pricing tiers', description: 'Create 2-3 pricing tiers based on research', tool_or_action: 'design', estimated_cost_usd: 0, estimated_hours: 2, completion_criteria: 'Pricing tiers documented' },
    { title: 'A/B price test', description: 'Show different prices to different segments and measure conversion', tool_or_action: 'test', estimated_cost_usd: 50, estimated_hours: 4, completion_criteria: 'Conversion data at different price points' },
    { title: 'Set launch pricing', description: 'Select pricing based on data and document rationale', tool_or_action: 'decide', estimated_cost_usd: 0, estimated_hours: 1, completion_criteria: 'Final pricing set with rationale' },
  ],
  moat: [
    { title: 'Map competitive landscape', description: 'Identify all direct and indirect competitors with their moats', tool_or_action: 'research', estimated_cost_usd: 0, estimated_hours: 4, completion_criteria: 'Competitive matrix documented' },
    { title: 'Analyze switching costs', description: 'Interview 5 users about what would make them switch', tool_or_action: 'interview', estimated_cost_usd: 0, estimated_hours: 4, completion_criteria: 'Switching cost analysis complete' },
    { title: 'Test retention metric', description: 'Measure 30-day retention or equivalent stickiness metric', tool_or_action: 'analytics', estimated_cost_usd: 0, estimated_hours: 2, completion_criteria: 'Retention data collected' },
    { title: 'Identify defensibility levers', description: 'List what creates lasting competitive advantage', tool_or_action: 'analysis', estimated_cost_usd: 0, estimated_hours: 2, completion_criteria: 'Defensibility document with 3+ levers' },
  ],
};

async function generatePlan(experimentId: string, teamId: string) {
  // Get the experiment and its hypothesis
  const [experiment] = await db
    .select()
    .from(schema.experiments)
    .where(eq(schema.experiments.id, experimentId))
    .limit(1);

  if (!experiment) throw new Error('Experiment not found');

  // Check for existing plan
  const [existing] = await db
    .select()
    .from(schema.experimentPlans)
    .where(eq(schema.experimentPlans.experimentId, experimentId))
    .limit(1);

  if (existing) throw new Error('Plan already exists for this experiment');

  // Get hypothesis type for template selection
  let hypothesisType = 'solution'; // default
  if (experiment.hypothesisId) {
    const [hypothesis] = await db
      .select()
      .from(schema.hypotheses)
      .where(eq(schema.hypotheses.id, experiment.hypothesisId))
      .limit(1);
    if (hypothesis) hypothesisType = hypothesis.type;
  }

  const template = PLAN_TEMPLATES[hypothesisType] || PLAN_TEMPLATES.solution;
  const steps = template.map((step, i) => ({
    order: i + 1,
    ...step,
  }));

  const totalBudget = steps.reduce((s, step) => s + step.estimated_cost_usd, 0);
  const now = new Date();
  const endDate = new Date(now);
  endDate.setDate(endDate.getDate() + 14);

  // Create the plan
  const [plan] = await db
    .insert(schema.experimentPlans)
    .values({
      experimentId,
      steps,
      budgetUsd: totalBudget,
      sprintStartDate: now,
      sprintEndDate: endDate,
      sprintDays: 14,
    } as any)
    .returning();

  // Create individual step records
  for (const step of steps) {
    await db.insert(schema.experimentSteps).values({
      planId: plan.id,
      orderIndex: step.order,
      title: step.title,
      description: step.description,
      toolOrAction: step.tool_or_action,
      estimatedCostUsd: step.estimated_cost_usd,
      estimatedHours: step.estimated_hours,
      completionCriteria: step.completion_criteria,
    } as any);
  }

  await audit(teamId, null, null, 'experiment_plan.generate', 'experiment_plan', plan.id, {
    experimentId,
    hypothesisType,
    stepCount: steps.length,
  });

  return plan;
}

async function getPlan(experimentId: string) {
  const [plan] = await db
    .select()
    .from(schema.experimentPlans)
    .where(eq(schema.experimentPlans.experimentId, experimentId))
    .limit(1);

  if (!plan) return null;

  const steps = await db
    .select()
    .from(schema.experimentSteps)
    .where(eq(schema.experimentSteps.planId, plan.id))
    .orderBy(asc(schema.experimentSteps.orderIndex));

  return { ...plan, stepsDetail: steps };
}

async function completeStep(stepId: string, result: string, teamId: string) {
  const [step] = await db
    .select()
    .from(schema.experimentSteps)
    .where(eq(schema.experimentSteps.id, stepId))
    .limit(1);

  if (!step) throw new Error('Step not found');

  const [updated] = await db
    .update(schema.experimentSteps)
    .set({
      status: 'completed',
      result,
      completedAt: new Date(),
    })
    .where(eq(schema.experimentSteps.id, stepId))
    .returning();

  // Update plan spent_usd
  if (step.estimatedCostUsd) {
    const [plan] = await db
      .select()
      .from(schema.experimentPlans)
      .where(eq(schema.experimentPlans.id, step.planId))
      .limit(1);

    if (plan) {
      const newSpent = (Number(plan.spentUsd) || 0) + Number(step.estimatedCostUsd);
      await db
        .update(schema.experimentPlans)
        .set({ spentUsd: newSpent, updatedAt: new Date() } as any)
        .where(eq(schema.experimentPlans.id, plan.id));
    }
  }

  await audit(teamId, null, null, 'experiment_step.complete', 'experiment_step', stepId, { result });

  return updated;
}

async function checkTimeline(experimentId: string) {
  const plan = await getPlan(experimentId);
  if (!plan) return null;

  const totalSteps = plan.stepsDetail.length;
  const completedSteps = plan.stepsDetail.filter(s => s.status === 'completed').length;
  const now = new Date();
  const start = plan.sprintStartDate ? new Date(plan.sprintStartDate) : now;
  const end = plan.sprintEndDate ? new Date(plan.sprintEndDate) : now;
  const totalDays = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
  const elapsedDays = Math.ceil((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  const remainingDays = Math.max(0, totalDays - elapsedDays);

  return {
    total_steps: totalSteps,
    completed_steps: completedSteps,
    progress_pct: Math.round((completedSteps / totalSteps) * 100),
    total_days: totalDays,
    elapsed_days: elapsedDays,
    remaining_days: remainingDays,
    budget_usd: Number(plan.budgetUsd) || 0,
    spent_usd: Number(plan.spentUsd) || 0,
    on_track: (completedSteps / totalSteps) >= (elapsedDays / totalDays),
  };
}

export const experimentExecutionService = {
  generatePlan,
  getPlan,
  completeStep,
  checkTimeline,
};
