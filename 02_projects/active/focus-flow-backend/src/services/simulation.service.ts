/**
 * Simulation Service - What-if calculations using portfolio + financial data
 */

interface SimulationParams {
  projects: string[];
  budgetPerDay: number;
  founderHoursPerWeek: number;
  riskTolerance: 'low' | 'medium' | 'high';
  timeHorizonWeeks: number;
}

interface SimulationResult {
  scenario: string;
  projectedMrr: number;
  experimentVelocity: number;
  validationTimeline: string;
  risks: string[];
  recommendations: string[];
}

/**
 * Run a simple what-if simulation.
 * Uses heuristic calculations based on budget/time inputs.
 */
async function run(params: SimulationParams): Promise<SimulationResult> {
  const {
    budgetPerDay = 20,
    founderHoursPerWeek = 20,
    riskTolerance = 'medium',
    timeHorizonWeeks = 12,
  } = params;

  // Heuristic: each $10/day supports ~2 experiments/week
  const experimentsPerWeek = Math.floor(budgetPerDay / 10) * 2;
  const totalExperiments = experimentsPerWeek * timeHorizonWeeks;

  // Heuristic: 1 in 5 experiments leads to a validated channel
  const riskMultiplier = riskTolerance === 'high' ? 1.5 : riskTolerance === 'low' ? 0.7 : 1.0;
  const validatedChannels = Math.floor((totalExperiments / 5) * riskMultiplier);

  // Heuristic: each validated channel can generate ~$200-500 MRR
  const mrrPerChannel = 300 * riskMultiplier;
  const projectedMrr = Math.round(validatedChannels * mrrPerChannel);

  // Timeline estimate
  const weeksToFirstValidation = Math.max(2, Math.ceil(5 / experimentsPerWeek));

  const risks: string[] = [];
  if (budgetPerDay > 50) risks.push('High daily spend may deplete reserves quickly');
  if (founderHoursPerWeek < 10) risks.push('Low founder involvement limits context for decisions');
  if (riskTolerance === 'high') risks.push('High risk tolerance may lead to premature scaling');
  if (timeHorizonWeeks < 4) risks.push('Short horizon limits experiment iteration cycles');

  const recommendations: string[] = [];
  if (experimentsPerWeek < 2) recommendations.push('Consider increasing budget to run at least 2 experiments/week');
  if (validatedChannels < 1) recommendations.push('Current pace unlikely to validate any channel — increase time or budget');
  if (founderHoursPerWeek > 40) recommendations.push('Founder time is saturated — delegate more to agents');

  return {
    scenario: `$${budgetPerDay}/day, ${founderHoursPerWeek}h/week, ${timeHorizonWeeks} weeks, ${riskTolerance} risk`,
    projectedMrr,
    experimentVelocity: experimentsPerWeek,
    validationTimeline: `First validation in ~${weeksToFirstValidation} weeks, ${validatedChannels} channels by week ${timeHorizonWeeks}`,
    risks,
    recommendations,
  };
}

export const simulationService = {
  run,
};
