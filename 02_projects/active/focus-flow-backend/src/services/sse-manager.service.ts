import { Response } from 'express';

const LOG_PREFIX = '[SSEManager]';

interface SSEClient {
  id: string;
  res: Response;
  connectedAt: number;
}

class SSEManagerService {
  private clients = new Map<string, SSEClient>();
  private clientCounter = 0;

  register(res: Response): string {
    const id = `sse-${++this.clientCounter}-${Date.now()}`;

    // SSE headers
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    });

    // Send initial connection event
    res.write(`event: connected\ndata: ${JSON.stringify({ client_id: id })}\n\n`);

    const client: SSEClient = { id, res, connectedAt: Date.now() };
    this.clients.set(id, client);

    // Clean up on disconnect
    res.on('close', () => {
      this.clients.delete(id);
      console.log(`${LOG_PREFIX} Client ${id} disconnected (${this.clients.size} remaining)`);
    });

    console.log(`${LOG_PREFIX} Client ${id} connected (${this.clients.size} total)`);
    return id;
  }

  send(clientId: string, event: string, data: any): void {
    const client = this.clients.get(clientId);
    if (!client) return;

    try {
      client.res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    } catch (err: any) {
      console.error(`${LOG_PREFIX} Failed to send to ${clientId}:`, err.message);
      this.clients.delete(clientId);
    }
  }

  broadcast(event: string, data: any): void {
    const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;

    for (const [id, client] of this.clients) {
      try {
        client.res.write(payload);
      } catch (err: any) {
        console.error(`${LOG_PREFIX} Failed to broadcast to ${id}:`, err.message);
        this.clients.delete(id);
      }
    }
  }

  getClientCount(): number {
    return this.clients.size;
  }
}

export const sseManager = new SSEManagerService();
