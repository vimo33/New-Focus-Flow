// Generate unique IDs for vault items

export function generateId(prefix: string): string {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const time = String(date.getTime()).slice(-6);

  return `${prefix}-${year}${month}${day}-${time}`;
}

export function generateInboxId(): string {
  return generateId('inbox');
}

export function generateTaskId(): string {
  return generateId('task');
}

export function generateProjectId(): string {
  return generateId('project');
}

export function generateIdeaId(): string {
  return generateId('idea');
}

export function generateHealthId(): string {
  return generateId('health');
}

export function generateThreadId(): string {
  return generateId('thread');
}

export function generateMessageId(): string {
  return generateId('msg');
}

export function generateVerdictId(): string {
  return generateId('vrd');
}

export function generateApprovalId(): string {
  return generateId('apr');
}

export function generateNotificationId(): string {
  return generateId('ntf');
}

export function generateBriefingId(): string {
  return generateId('brf');
}

export function generateAgentActionId(): string {
  return generateId('act');
}

export function generateActivityId(): string {
  return generateId('atv');
}

export function generateProfileId(): string {
  return generateId('profile');
}

export function generateRevenueId(): string {
  return generateId('rev');
}

export function generateCostId(): string {
  return generateId('cost');
}

export function generateSnapshotId(): string {
  return generateId('snap');
}

export function generateNetworkContactId(): string {
  return generateId('nc');
}

export function generateImportJobId(): string {
  return generateId('imp');
}
