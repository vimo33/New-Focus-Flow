import path from 'path';
import fs from 'fs/promises';
import {
  InboxItem,
  Task,
  Project,
  Idea,
  HealthMetric,
  InboxCounts,
  ProcessInboxRequest
} from '../models/types';
import {
  writeJsonFile,
  readJsonFile,
  listFiles,
  deleteFile,
  getVaultPath,
  appendToFile,
  ensureDir
} from '../utils/file-operations';
import {
  generateInboxId,
  generateTaskId,
  generateProjectId,
  generateIdeaId,
  generateHealthId
} from '../utils/id-generator';

export class VaultService {
  // ==================== INBOX OPERATIONS ====================

  async createInboxItem(item: Partial<InboxItem>): Promise<InboxItem> {
    const id = generateInboxId();
    const inboxItem: InboxItem = {
      id,
      text: item.text || '',
      category: item.category,
      prefix: item.prefix,
      source: item.source || 'api',
      created_at: new Date().toISOString(),
      metadata: item.metadata,
      ai_classification: item.ai_classification
    };

    const filePath = getVaultPath('00_inbox', 'raw', `${id}.json`);
    await writeJsonFile(filePath, inboxItem);

    return inboxItem;
  }

  async getInboxItems(filter?: string): Promise<InboxItem[]> {
    const rawDir = getVaultPath('00_inbox', 'raw');
    const files = await listFiles(rawDir);

    const items: InboxItem[] = [];
    for (const file of files) {
      if (!file.endsWith('.json')) continue;

      const filePath = path.join(rawDir, file);
      const item = await readJsonFile<InboxItem>(filePath);

      if (item) {
        if (!filter || item.category === filter) {
          items.push(item);
        }
      }
    }

    // Sort by created_at descending (newest first)
    items.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    return items;
  }

  async getInboxItem(id: string): Promise<InboxItem | null> {
    const filePath = getVaultPath('00_inbox', 'raw', `${id}.json`);
    return await readJsonFile<InboxItem>(filePath);
  }

  async getInboxCounts(): Promise<InboxCounts> {
    const items = await this.getInboxItems();

    return {
      all: items.length,
      work: items.filter(i => i.category === 'work').length,
      personal: items.filter(i => i.category === 'personal').length,
      ideas: items.filter(i => i.category === 'ideas').length
    };
  }

  async processInboxItem(id: string, request: ProcessInboxRequest): Promise<void> {
    const item = await this.getInboxItem(id);
    if (!item) {
      throw new Error(`Inbox item ${id} not found`);
    }

    switch (request.action) {
      case 'task':
        if (request.task_data) {
          await this.createTask({
            ...request.task_data,
            title: request.task_data.title || item.text,
            description: request.task_data.description || item.text
          });
        }
        break;

      case 'project':
        if (request.project_data) {
          await this.createProject({
            ...request.project_data,
            title: request.project_data.title || item.text,
            description: request.project_data.description || item.text
          });
        }
        break;

      case 'idea':
        if (request.idea_data) {
          await this.createIdea({
            ...request.idea_data,
            title: request.idea_data.title || item.text,
            description: request.idea_data.description || item.text
          });
        }
        break;

      case 'archive':
        // Move to archive
        const archivePath = getVaultPath('00_inbox', 'archive', `${id}.json`);
        await writeJsonFile(archivePath, { ...item, processed_at: new Date().toISOString() });
        break;

      case 'delete':
        // Just delete, no archive
        break;
    }

    // Remove from raw inbox
    const rawPath = getVaultPath('00_inbox', 'raw', `${id}.json`);
    await deleteFile(rawPath);
  }

  // ==================== TASK OPERATIONS ====================

  async createTask(task: Partial<Task>): Promise<Task> {
    const id = generateTaskId();
    const newTask: Task = {
      id,
      title: task.title || 'Untitled Task',
      description: task.description,
      category: task.category || 'personal',
      status: task.status || 'todo',
      priority: task.priority,
      due_date: task.due_date,
      project_id: task.project_id,
      created_at: new Date().toISOString(),
      metadata: task.metadata
    };

    const categoryDir = task.category || 'personal';
    const filePath = getVaultPath('01_tasks', categoryDir, `${id}.json`);
    await writeJsonFile(filePath, newTask);

    return newTask;
  }

  async getTasks(category?: string): Promise<Task[]> {
    const categories = category ? [category] : ['work', 'personal', 'scheduled'];
    const tasks: Task[] = [];

    for (const cat of categories) {
      const taskDir = getVaultPath('01_tasks', cat);
      const files = await listFiles(taskDir);

      for (const file of files) {
        if (!file.endsWith('.json')) continue;

        const filePath = path.join(taskDir, file);
        const task = await readJsonFile<Task>(filePath);
        if (task) {
          tasks.push(task);
        }
      }
    }

    return tasks.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  async updateTask(id: string, updates: Partial<Task>): Promise<Task | null> {
    // Find task across all categories
    for (const category of ['work', 'personal', 'scheduled']) {
      const filePath = getVaultPath('01_tasks', category, `${id}.json`);
      const task = await readJsonFile<Task>(filePath);

      if (task) {
        const updatedTask = { ...task, ...updates };
        await writeJsonFile(filePath, updatedTask);
        return updatedTask;
      }
    }

    return null;
  }

  async deleteTask(id: string): Promise<boolean> {
    for (const category of ['work', 'personal', 'scheduled']) {
      const filePath = getVaultPath('01_tasks', category, `${id}.json`);
      const task = await readJsonFile<Task>(filePath);
      if (task) {
        await deleteFile(filePath);
        return true;
      }
    }
    return false;
  }

  // ==================== PROJECT OPERATIONS ====================

  async createProject(project: Partial<Project>): Promise<Project> {
    const id = generateProjectId();
    const newProject: Project = {
      id,
      title: project.title || 'Untitled Project',
      description: project.description,
      status: project.status || 'active',
      phase: (project as any).phase || 'concept',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      metadata: project.metadata,
      ...(project as any).idea_id ? { idea_id: (project as any).idea_id } : {},
    };

    const filePath = getVaultPath('02_projects', 'active', `${id}.json`);
    await writeJsonFile(filePath, newProject);

    return newProject;
  }

  async getProjects(status?: string): Promise<Project[]> {
    const statuses = status ? [status] : ['active', 'paused', 'completed'];
    const projects: Project[] = [];

    for (const stat of statuses) {
      const projectDir = getVaultPath('02_projects', stat);
      const files = await listFiles(projectDir);

      for (const file of files) {
        if (!file.endsWith('.json')) continue;

        const filePath = path.join(projectDir, file);
        const project = await readJsonFile<Project>(filePath);
        if (project) {
          projects.push(project);
        }
      }
    }

    return projects.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
  }

  /**
   * Get tasks for a specific project
   */
  async getTasksByProject(projectId: string): Promise<Task[]> {
    const allTasks = await this.getTasks();
    return allTasks.filter(task => task.project_id === projectId);
  }

  /**
   * Calculate progress for a project based on task completion
   * Returns percentage (0-100) rounded to nearest integer
   */
  async calculateProjectProgress(projectId: string): Promise<number> {
    const tasks = await this.getTasksByProject(projectId);

    if (tasks.length === 0) return 0;

    const completedTasks = tasks.filter(task => task.status === 'done');
    const progressPercent = (completedTasks.length / tasks.length) * 100;

    return Math.round(progressPercent);
  }

  /**
   * Get a single project by ID, searching across status directories
   */
  async getProjectById(projectId: string): Promise<Project | null> {
    for (const status of ['active', 'paused', 'completed']) {
      const filePath = getVaultPath('02_projects', status, `${projectId}.json`);
      const project = await readJsonFile<Project>(filePath);
      if (project) return project;
    }
    return null;
  }

  /**
   * Update a project by ID. Finds it across status directories and saves.
   */
  async updateProject(projectId: string, updates: Partial<Project>): Promise<Project | null> {
    for (const status of ['active', 'paused', 'completed']) {
      const filePath = getVaultPath('02_projects', status, `${projectId}.json`);
      const existing = await readJsonFile<Project>(filePath);
      if (existing) {
        const updated: Project = {
          ...existing,
          ...updates,
          id: existing.id, // prevent ID override
          updated_at: new Date().toISOString(),
        };
        await writeJsonFile(filePath, updated);
        return updated;
      }
    }
    return null;
  }

  /**
   * Update an idea by ID. Finds it across status directories and saves.
   */
  async updateIdea(ideaId: string, updates: Partial<Idea>): Promise<Idea | null> {
    for (const status of ['inbox', 'validated', 'rejected']) {
      const filePath = getVaultPath('03_ideas', status, `${ideaId}.json`);
      const existing = await readJsonFile<Idea>(filePath);
      if (existing) {
        const updated: Idea = { ...existing, ...updates, id: existing.id };
        await writeJsonFile(filePath, updated);
        return updated;
      }
    }
    return null;
  }

  // ==================== IDEA OPERATIONS ====================

  async createIdea(idea: Partial<Idea>): Promise<Idea> {
    const id = generateIdeaId();
    const newIdea: Idea = {
      id,
      title: idea.title || 'Untitled Idea',
      description: idea.description || '',
      status: idea.status || 'inbox',
      created_at: new Date().toISOString(),
      metadata: idea.metadata
    };

    const filePath = getVaultPath('03_ideas', 'inbox', `${id}.json`);
    await writeJsonFile(filePath, newIdea);

    return newIdea;
  }

  async getIdea(id: string): Promise<Idea | null> {
    // Try to find the idea in all possible locations
    const statuses = ['inbox', 'validated', 'rejected'];

    for (const status of statuses) {
      const filePath = getVaultPath('03_ideas', status, `${id}.json`);
      const idea = await readJsonFile<Idea>(filePath);
      if (idea) {
        return idea;
      }
    }

    return null;
  }

  async getIdeas(status?: string): Promise<Idea[]> {
    const statuses = status ? [status] : ['inbox', 'validated', 'rejected'];
    const ideas: Idea[] = [];

    for (const stat of statuses) {
      const ideaDir = getVaultPath('03_ideas', stat);
      const files = await listFiles(ideaDir);

      for (const file of files) {
        if (!file.endsWith('.json')) continue;

        const filePath = path.join(ideaDir, file);
        const idea = await readJsonFile<Idea>(filePath);
        if (idea) {
          ideas.push(idea);
        }
      }
    }

    return ideas.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  // ==================== NOTES OPERATIONS ====================

  async getProjectNotes(projectId: string): Promise<string> {
    const filePath = getVaultPath('04_notes', 'work', `${projectId}.md`);
    try {
      return await fs.readFile(filePath, 'utf-8');
    } catch {
      return '';
    }
  }

  async saveProjectNotes(projectId: string, content: string): Promise<void> {
    const dirPath = getVaultPath('04_notes', 'work');
    await ensureDir(dirPath);
    const filePath = path.join(dirPath, `${projectId}.md`);
    await fs.writeFile(filePath, content, 'utf-8');
  }

  // ==================== HEALTH OPERATIONS ====================

  async logHealthMetric(metric: Partial<HealthMetric>): Promise<HealthMetric> {
    const id = generateHealthId();
    const healthMetric: HealthMetric = {
      id,
      metric_type: metric.metric_type || 'mood',
      value: metric.value || 0,
      unit: metric.unit,
      date: metric.date || new Date().toISOString().split('T')[0],
      notes: metric.notes,
      metadata: metric.metadata
    };

    // Log to CSV file for easy analysis
    const csvLine = `${healthMetric.date},${healthMetric.metric_type},${healthMetric.value},${healthMetric.unit || ''},${healthMetric.notes || ''}\n`;
    const csvPath = getVaultPath('06_health', 'logs', 'health-log.csv');
    await appendToFile(csvPath, csvLine);

    // Also save as JSON for detailed metadata
    const jsonPath = getVaultPath('06_health', 'logs', `${id}.json`);
    await writeJsonFile(jsonPath, healthMetric);

    return healthMetric;
  }

  // ==================== FOCUS SESSION OPERATIONS ====================

  async createFocusSession(data: { project_id: string; session_type?: string; work_duration?: number; break_duration?: number }): Promise<any> {
    const id = `focus-${Date.now()}`;
    const session = {
      id,
      project_id: data.project_id,
      session_type: data.session_type || 'pomodoro',
      work_duration: data.work_duration || 25,
      break_duration: data.break_duration || 5,
      started_at: new Date().toISOString(),
      ended_at: null,
      duration_minutes: null,
      status: 'active',
      notes: null,
    };
    const dirPath = getVaultPath('07_system', 'focus-sessions');
    await ensureDir(dirPath);
    await writeJsonFile(path.join(dirPath, `${id}.json`), session);
    return session;
  }

  async updateFocusSession(id: string, updates: Record<string, any>): Promise<any> {
    const filePath = getVaultPath('07_system', 'focus-sessions', `${id}.json`);
    const session = await readJsonFile<any>(filePath);
    if (!session) return null;
    const updated = { ...session, ...updates };
    if (updates.ended_at && session.started_at) {
      updated.duration_minutes = Math.round((new Date(updates.ended_at).getTime() - new Date(session.started_at).getTime()) / 60000);
    }
    await writeJsonFile(filePath, updated);
    return updated;
  }

  async getFocusSessions(projectId?: string): Promise<any[]> {
    const dirPath = getVaultPath('07_system', 'focus-sessions');
    const files = await listFiles(dirPath);
    const sessions: any[] = [];
    for (const file of files) {
      if (!file.endsWith('.json')) continue;
      const session = await readJsonFile<any>(path.join(dirPath, file));
      if (session && (!projectId || session.project_id === projectId)) {
        sessions.push(session);
      }
    }
    return sessions.sort((a, b) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime());
  }

  // ==================== ACTIVITY LOG OPERATIONS ====================

  async logActivity(projectId: string, event: { type: string; description: string; metadata?: Record<string, any> }): Promise<void> {
    const dirPath = getVaultPath('07_system', 'activity');
    await ensureDir(dirPath);
    const filePath = path.join(dirPath, `${projectId}.json`);

    let entries: any[] = [];
    try {
      const raw = await fs.readFile(filePath, 'utf-8');
      entries = JSON.parse(raw);
    } catch {}

    entries.unshift({
      id: `act-${Date.now()}`,
      type: event.type,
      description: event.description,
      metadata: event.metadata,
      timestamp: new Date().toISOString(),
    });

    // Keep last 200 entries
    if (entries.length > 200) entries = entries.slice(0, 200);

    await fs.writeFile(filePath, JSON.stringify(entries, null, 2), 'utf-8');
  }

  async getActivity(projectId: string): Promise<any[]> {
    const filePath = getVaultPath('07_system', 'activity', `${projectId}.json`);
    try {
      const raw = await fs.readFile(filePath, 'utf-8');
      return JSON.parse(raw);
    } catch {
      return [];
    }
  }

  // ==================== GENERIC FILE OPERATIONS ====================

  /**
   * Get data from a vault path (for orchestrator and other services)
   */
  async getData(relativePath: string): Promise<string> {
    const filePath = getVaultPath(relativePath);
    try {
      return await fs.readFile(filePath, 'utf-8');
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        throw new Error(`File not found: ${relativePath}`);
      }
      throw error;
    }
  }

  /**
   * Save data to a vault path (for orchestrator and other services)
   */
  async saveData(relativePath: string, data: string): Promise<void> {
    const filePath = getVaultPath(relativePath);
    const dir = path.dirname(filePath);
    await ensureDir(dir);
    await fs.writeFile(filePath, data, 'utf-8');
  }

  /**
   * Delete a file from a vault path
   */
  async deleteData(relativePath: string): Promise<void> {
    const filePath = getVaultPath(relativePath);
    await fs.unlink(filePath).catch(() => {});
  }

  /**
   * List files in a vault directory
   */
  async listFiles(relativePath: string): Promise<string[]> {
    const dirPath = getVaultPath(relativePath);
    return await listFiles(dirPath);
  }
}
