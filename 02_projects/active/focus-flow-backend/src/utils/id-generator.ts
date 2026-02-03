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
