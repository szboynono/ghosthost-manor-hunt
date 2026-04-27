import { WebSocketServer, WebSocket } from "ws";
import { SessionManager } from "./sessionManager";
import type { ClientMessage, ServerMessage } from "../src/session/sessionTypes";

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3001;
const manager = new SessionManager();
const clientSockets = new Map<string, WebSocket>(); // clientId → ws
let clientCounter = 0;

const wss = new WebSocketServer({ port: PORT });

function send(ws: WebSocket, msg: ServerMessage): void {
  if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(msg));
}

function broadcastLobby(instanceId: string): void {
  const slots = manager.getLobbySlots(instanceId);
  const hostClientId = manager.getHostClientId(instanceId);
  const msg: ServerMessage = { type: "lobbyUpdate", slots, hostClientId };

  for (const [cid, sock] of clientSockets) {
    const info = manager.getClientInfo(cid);
    if (info?.instanceId === instanceId) send(sock, msg);
  }
}

wss.on("connection", (ws) => {
  const clientId = `c${++clientCounter}`;
  clientSockets.set(clientId, ws);

  ws.on("message", (raw) => {
    let msg: ClientMessage;
    try { msg = JSON.parse(raw.toString()) as ClientMessage; }
    catch { return; }

    switch (msg.type) {
      case "join": {
        const result = manager.join(msg.instanceId, clientId, msg.displayName, msg.avatarUrl);
        send(ws, {
          type: "welcome",
          clientId,
          assignedPlayerId: result.assignedPlayerId,
          isHost: result.isHost,
        });
        broadcastLobby(msg.instanceId);
        break;
      }
      case "ready": {
        const result = manager.setReady(clientId, msg.ready);
        if (result) broadcastLobby(result.instanceId);
        break;
      }
      case "beginHunt": {
        const result = manager.beginHunt(clientId);
        if (!result) break;
        const huntMsg: ServerMessage = { type: "huntStart", signal: result.signal };
        for (const cid of result.clientIds) {
          const sock = clientSockets.get(cid);
          if (sock) send(sock, huntMsg);
        }
        break;
      }
    }
  });

  ws.on("close", () => {
    const result = manager.leave(clientId);
    clientSockets.delete(clientId);
    if (result && result.remainingClientIds.length > 0) broadcastLobby(result.instanceId);
  });
});

console.log(`GhostHost session server listening on ws://localhost:${PORT}`);
