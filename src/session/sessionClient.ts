import type { ClientMessage, ServerMessage } from "./sessionTypes";

export type SessionConnectionStatus = "disconnected" | "connecting" | "connected" | "error";

type MessageHandler = (msg: ServerMessage) => void;
type StatusHandler = (status: SessionConnectionStatus) => void;

export class SessionClient {
  private ws: WebSocket | null = null;

  constructor(
    private readonly url: string,
    private readonly onMessage: MessageHandler,
    private readonly onStatusChange: StatusHandler,
  ) {}

  connect(): void {
    this.onStatusChange("connecting");
    const ws = new WebSocket(this.url);
    this.ws = ws;

    ws.onopen = () => this.onStatusChange("connected");
    ws.onclose = () => { this.ws = null; this.onStatusChange("disconnected"); };
    ws.onerror = () => this.onStatusChange("error");
    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data as string) as ServerMessage;
        this.onMessage(msg);
      } catch { /* ignore malformed frames */ }
    };
  }

  send(msg: ClientMessage): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(msg));
    }
  }

  disconnect(): void {
    this.ws?.close();
    this.ws = null;
  }
}
