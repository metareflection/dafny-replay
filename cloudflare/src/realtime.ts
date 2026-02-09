// Durable Object for WebSocket-based realtime updates
// One instance per entity (project/group), manages all connected clients

export class RealtimeDurableObject {
  private connections: Set<WebSocket> = new Set()
  private state: DurableObjectState

  constructor(state: DurableObjectState) {
    this.state = state
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url)

    // Internal broadcast endpoint (called from dispatch)
    if (url.pathname === '/broadcast') {
      return this.handleBroadcast(request)
    }

    // WebSocket upgrade request
    if (request.headers.get('Upgrade') === 'websocket') {
      return this.handleWebSocket(request)
    }

    return new Response('Expected WebSocket or broadcast', { status: 400 })
  }

  private async handleWebSocket(_request: Request): Promise<Response> {
    const pair = new WebSocketPair()
    const [client, server] = Object.values(pair)

    // Accept the WebSocket connection
    server.accept()
    this.connections.add(server)

    // Handle incoming messages (ping/pong, etc.)
    server.addEventListener('message', (event) => {
      // Echo ping messages for keep-alive
      if (event.data === 'ping') {
        server.send('pong')
      }
    })

    // Clean up on close
    server.addEventListener('close', () => {
      this.connections.delete(server)
    })

    // Clean up on error
    server.addEventListener('error', () => {
      this.connections.delete(server)
    })

    return new Response(null, {
      status: 101,
      webSocket: client
    })
  }

  private async handleBroadcast(request: Request): Promise<Response> {
    try {
      const update = await request.json() as { version: number; state: unknown }
      const message = JSON.stringify(update)

      // Send to all connected clients
      const deadConnections: WebSocket[] = []

      for (const ws of this.connections) {
        try {
          ws.send(message)
        } catch {
          // Mark dead connections for removal
          deadConnections.push(ws)
        }
      }

      // Clean up dead connections
      for (const ws of deadConnections) {
        this.connections.delete(ws)
      }

      return new Response('OK', { status: 200 })
    } catch (e) {
      console.error('Broadcast error:', e)
      return new Response('Broadcast failed', { status: 500 })
    }
  }
}

// Helper to broadcast updates to a Durable Object
export async function broadcastUpdate(
  realtime: DurableObjectNamespace,
  entityId: string,
  version: number,
  state: unknown
): Promise<void> {
  const id = realtime.idFromName(entityId)
  const stub = realtime.get(id)
  await stub.fetch('http://internal/broadcast', {
    method: 'POST',
    body: JSON.stringify({ version, state })
  })
}
