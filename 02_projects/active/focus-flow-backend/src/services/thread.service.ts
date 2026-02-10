import path from 'path';
import fs from 'fs/promises';
import { Thread, ThreadMessage } from '../models/types';
import { generateThreadId, generateMessageId } from '../utils/id-generator';
import {
  writeJsonFile,
  readJsonFile,
  listFiles,
  getVaultPath,
  ensureDir,
} from '../utils/file-operations';

const THREADS_DIR = '08_threads';

export class ThreadService {
  private getThreadDir(threadId: string): string {
    return getVaultPath(THREADS_DIR, threadId);
  }

  private getThreadMetaPath(threadId: string): string {
    return path.join(this.getThreadDir(threadId), 'thread.json');
  }

  private getMessagesDir(threadId: string): string {
    return path.join(this.getThreadDir(threadId), 'messages');
  }

  async createThread(data: { title?: string; project_id?: string }): Promise<Thread> {
    const id = generateThreadId();
    const now = new Date().toISOString();

    const thread: Thread = {
      id,
      title: data.title || 'New Conversation',
      project_id: data.project_id,
      created_at: now,
      updated_at: now,
      message_count: 0,
    };

    await ensureDir(this.getMessagesDir(id));
    await writeJsonFile(this.getThreadMetaPath(id), thread);

    return thread;
  }

  async getThread(threadId: string): Promise<Thread | null> {
    return readJsonFile<Thread>(this.getThreadMetaPath(threadId));
  }

  async listThreads(projectId?: string): Promise<Thread[]> {
    const threadsRoot = getVaultPath(THREADS_DIR);
    const dirs = await listFiles(threadsRoot);

    const threads: Thread[] = [];
    for (const dir of dirs) {
      const thread = await readJsonFile<Thread>(
        path.join(threadsRoot, dir, 'thread.json')
      );
      if (thread) {
        if (projectId && thread.project_id !== projectId) continue;
        threads.push(thread);
      }
    }

    threads.sort(
      (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
    );
    return threads;
  }

  async updateThread(
    threadId: string,
    updates: Partial<Pick<Thread, 'title' | 'project_id'>>
  ): Promise<Thread | null> {
    const thread = await this.getThread(threadId);
    if (!thread) return null;

    const updated: Thread = {
      ...thread,
      ...updates,
      updated_at: new Date().toISOString(),
    };

    await writeJsonFile(this.getThreadMetaPath(threadId), updated);
    return updated;
  }

  async addMessage(
    threadId: string,
    data: { role: 'user' | 'assistant'; content: string; source: 'voice' | 'text' }
  ): Promise<ThreadMessage> {
    const thread = await this.getThread(threadId);
    if (!thread) throw new Error(`Thread ${threadId} not found`);

    const id = generateMessageId();
    const message: ThreadMessage = {
      id,
      thread_id: threadId,
      role: data.role,
      content: data.content,
      source: data.source,
      created_at: new Date().toISOString(),
    };

    await writeJsonFile(
      path.join(this.getMessagesDir(threadId), `${id}.json`),
      message
    );

    // Update thread metadata
    const preview =
      data.content.length > 100 ? data.content.slice(0, 100) + '...' : data.content;
    await writeJsonFile(this.getThreadMetaPath(threadId), {
      ...thread,
      message_count: thread.message_count + 1,
      last_message_preview: preview,
      updated_at: new Date().toISOString(),
    });

    return message;
  }

  async getMessages(threadId: string, limit?: number): Promise<ThreadMessage[]> {
    const messagesDir = this.getMessagesDir(threadId);
    const files = await listFiles(messagesDir);

    const messages: ThreadMessage[] = [];
    for (const file of files) {
      if (!file.endsWith('.json')) continue;
      const msg = await readJsonFile<ThreadMessage>(path.join(messagesDir, file));
      if (msg) messages.push(msg);
    }

    messages.sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );

    if (limit && limit > 0) {
      return messages.slice(-limit);
    }
    return messages;
  }

  async deleteThread(threadId: string): Promise<boolean> {
    const thread = await this.getThread(threadId);
    if (!thread) return false;

    const threadDir = this.getThreadDir(threadId);
    await fs.rm(threadDir, { recursive: true, force: true });
    return true;
  }
}
