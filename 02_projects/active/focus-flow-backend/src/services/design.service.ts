import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs/promises';
import { getVaultPath, ensureDir } from '../utils/file-operations';
import { writeJsonFile, readJsonFile } from '../utils/file-operations';

const execAsync = promisify(exec);

export interface DesignScreen {
  id: string;
  project_id: string;
  name: string;
  prompt: string;
  status: 'generating' | 'completed' | 'failed';
  image_path?: string;
  html_path?: string;
  stitch_screen_id?: string;
  stitch_project_id?: string;
  created_at: string;
  completed_at?: string;
  error?: string;
}

export interface DesignProject {
  id: string;
  project_id: string;
  stitch_project_id?: string;
  screens: DesignScreen[];
  created_at: string;
}

class DesignService {
  private getDesignDir(projectId: string): string {
    return getVaultPath('07_system', 'designs', projectId);
  }

  private getDesignMetaPath(projectId: string): string {
    return path.join(this.getDesignDir(projectId), 'design-project.json');
  }

  async getDesignProject(projectId: string): Promise<DesignProject | null> {
    return readJsonFile<DesignProject>(this.getDesignMetaPath(projectId));
  }

  async getOrCreateDesignProject(projectId: string): Promise<DesignProject> {
    let dp = await this.getDesignProject(projectId);
    if (!dp) {
      dp = {
        id: `design-${Date.now()}`,
        project_id: projectId,
        screens: [],
        created_at: new Date().toISOString(),
      };
      await ensureDir(this.getDesignDir(projectId));
      await writeJsonFile(this.getDesignMetaPath(projectId), dp);
    }
    return dp;
  }

  async generateScreen(projectId: string, prompt: string, model: string = 'gemini-2.0-flash'): Promise<DesignScreen> {
    const dp = await this.getOrCreateDesignProject(projectId);
    const screenId = `screen-${Date.now()}`;
    const designDir = this.getDesignDir(projectId);

    const screen: DesignScreen = {
      id: screenId,
      project_id: projectId,
      name: prompt.substring(0, 60),
      prompt,
      status: 'generating',
      created_at: new Date().toISOString(),
    };

    dp.screens.push(screen);
    await writeJsonFile(this.getDesignMetaPath(projectId), dp);

    // Run Gemini CLI with Stitch in the background
    this.runStitchGeneration(projectId, screenId, prompt, model, designDir).catch((err) => {
      console.error('Stitch generation failed:', err);
    });

    return screen;
  }

  private async runStitchGeneration(
    projectId: string,
    screenId: string,
    prompt: string,
    model: string,
    designDir: string,
  ): Promise<void> {
    try {
      await ensureDir(path.join(designDir, 'screens'));

      // Use Gemini CLI with Stitch to generate the design
      const safePrompt = prompt.replace(/'/g, "'\\''");
      const cmd = `gemini -p '/stitch Design a screen: ${safePrompt}, using ${model}' 2>&1`;

      const { stdout } = await execAsync(cmd, {
        timeout: 300000,
        env: { ...process.env, HOME: process.env.HOME || '/root' },
      });

      // Parse Stitch response - look for screen ID or image URL
      const screenIdMatch = stdout.match(/screen[_\s]?(?:id|ID)[:\s]+([a-zA-Z0-9_-]+)/i);
      const imageMatch = stdout.match(/https:\/\/[^\s]+\.(png|jpg|jpeg|webp)/i);

      // If we got an image URL, download it
      let imagePath: string | undefined;
      if (imageMatch) {
        imagePath = path.join(designDir, 'screens', `${screenId}.png`);
        try {
          const { stdout: imgData } = await execAsync(`curl -sL "${imageMatch[0]}" -o "${imagePath}"`, { timeout: 30000 });
        } catch {}
      }

      // Save the full output as HTML reference
      const htmlPath = path.join(designDir, 'screens', `${screenId}.html`);
      await fs.writeFile(htmlPath, `<!-- Stitch Design Output -->\n<!-- Prompt: ${prompt} -->\n<pre>${stdout}</pre>`, 'utf-8');

      // Update screen status
      const dp = await this.getDesignProject(projectId);
      if (dp) {
        const screen = dp.screens.find((s) => s.id === screenId);
        if (screen) {
          screen.status = 'completed';
          screen.completed_at = new Date().toISOString();
          screen.html_path = htmlPath;
          if (imagePath) screen.image_path = imagePath;
          if (screenIdMatch) screen.stitch_screen_id = screenIdMatch[1];
        }
        await writeJsonFile(this.getDesignMetaPath(projectId), dp);
      }
    } catch (error: any) {
      const dp = await this.getDesignProject(projectId);
      if (dp) {
        const screen = dp.screens.find((s) => s.id === screenId);
        if (screen) {
          screen.status = 'failed';
          screen.error = error.message;
        }
        await writeJsonFile(this.getDesignMetaPath(projectId), dp);
      }
    }
  }

  async listStitchProjects(): Promise<string> {
    try {
      const { stdout } = await execAsync(
        `gemini -p '/stitch What Stitch projects do I have?' 2>&1`,
        { timeout: 60000, env: { ...process.env, HOME: process.env.HOME || '/root' } }
      );
      return stdout;
    } catch (error: any) {
      return `Error listing projects: ${error.message}`;
    }
  }

  async getScreens(projectId: string): Promise<DesignScreen[]> {
    const dp = await this.getDesignProject(projectId);
    return dp?.screens || [];
  }

  async deleteScreen(projectId: string, screenId: string): Promise<boolean> {
    const dp = await this.getDesignProject(projectId);
    if (!dp) return false;
    const idx = dp.screens.findIndex((s) => s.id === screenId);
    if (idx === -1) return false;

    const screen = dp.screens[idx];
    // Clean up files
    if (screen.image_path) await fs.unlink(screen.image_path).catch(() => {});
    if (screen.html_path) await fs.unlink(screen.html_path).catch(() => {});

    dp.screens.splice(idx, 1);
    await writeJsonFile(this.getDesignMetaPath(projectId), dp);
    return true;
  }
}

export const designService = new DesignService();
