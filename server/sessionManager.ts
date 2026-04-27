import type { PlayerId } from "../src/game/types";
import type { LobbySlot } from "../src/session/sessionTypes";

const SLOT_ORDER: PlayerId[] = ["p1", "p2", "p3", "p4"];

interface ClientRecord {
  clientId: string;
  instanceId: string;
  playerId: PlayerId | null; // null = spectator (5th+ client)
  displayName: string;
  avatarUrl: string | null;
  ready: boolean;
}

interface InstanceRecord {
  clients: Map<string, ClientRecord>;
  hostClientId: string | null;
  huntSignal: number;
}

export interface JoinResult {
  assignedPlayerId: PlayerId | null;
  isHost: boolean;
}

export interface LeaveResult {
  instanceId: string;
  remainingClientIds: string[];
  newHostClientId: string | null;
}

export interface ReadyResult {
  instanceId: string;
  clientIds: string[];
}

export interface HuntResult {
  instanceId: string;
  signal: number;
  clientIds: string[];
}

export class SessionManager {
  private instances = new Map<string, InstanceRecord>();
  private clientIndex = new Map<string, string>(); // clientId → instanceId

  join(
    instanceId: string,
    clientId: string,
    displayName: string,
    avatarUrl: string | null,
  ): JoinResult {
    let instance = this.instances.get(instanceId);
    if (!instance) {
      instance = { clients: new Map(), hostClientId: null, huntSignal: 0 };
      this.instances.set(instanceId, instance);
    }

    const takenSlots = new Set(
      Array.from(instance.clients.values())
        .filter(c => c.playerId !== null)
        .map(c => c.playerId as PlayerId),
    );
    const slot = SLOT_ORDER.find(s => !takenSlots.has(s)) ?? null;

    const isHost = slot !== null && instance.hostClientId === null;

    const record: ClientRecord = {
      clientId,
      instanceId,
      playerId: slot,
      displayName,
      avatarUrl,
      ready: false,
    };
    instance.clients.set(clientId, record);
    if (isHost) instance.hostClientId = clientId;
    this.clientIndex.set(clientId, instanceId);

    return { assignedPlayerId: slot, isHost };
  }

  leave(clientId: string): LeaveResult | null {
    const instanceId = this.clientIndex.get(clientId);
    if (!instanceId) return null;

    const instance = this.instances.get(instanceId)!;
    instance.clients.delete(clientId);
    this.clientIndex.delete(clientId);

    if (instance.hostClientId === clientId) {
      const firstPlayer = Array.from(instance.clients.values()).find(c => c.playerId !== null);
      instance.hostClientId = firstPlayer?.clientId ?? null;
    }

    const remainingClientIds = Array.from(instance.clients.keys());

    if (instance.clients.size === 0) {
      this.instances.delete(instanceId);
    }

    return { instanceId, remainingClientIds, newHostClientId: instance.hostClientId ?? null };
  }

  setReady(clientId: string, ready: boolean): ReadyResult | null {
    const instanceId = this.clientIndex.get(clientId);
    if (!instanceId) return null;

    const instance = this.instances.get(instanceId);
    const record = instance?.clients.get(clientId);
    if (!record) return null;

    record.ready = ready;

    return { instanceId, clientIds: Array.from(instance!.clients.keys()) };
  }

  beginHunt(clientId: string): HuntResult | null {
    const instanceId = this.clientIndex.get(clientId);
    if (!instanceId) return null;

    const instance = this.instances.get(instanceId);
    if (!instance || instance.hostClientId !== clientId) return null;

    instance.huntSignal += 1;

    return {
      instanceId,
      signal: instance.huntSignal,
      clientIds: Array.from(instance.clients.keys()),
    };
  }

  getClientInfo(clientId: string): ClientRecord | undefined {
    const instanceId = this.clientIndex.get(clientId);
    if (!instanceId) return undefined;
    return this.instances.get(instanceId)?.clients.get(clientId);
  }

  getInstanceClients(instanceId: string): ClientRecord[] {
    const instance = this.instances.get(instanceId);
    if (!instance) return [];
    return Array.from(instance.clients.values());
  }

  getLobbySlots(instanceId: string): LobbySlot[] {
    const clients = this.getInstanceClients(instanceId);
    return SLOT_ORDER.reduce<LobbySlot[]>((acc, slot) => {
      const client = clients.find(c => c.playerId === slot);
      if (client) {
        acc.push({
          playerId: slot,
          clientId: client.clientId,
          displayName: client.displayName,
          avatarUrl: client.avatarUrl,
          ready: client.ready,
        });
      }
      return acc;
    }, []);
  }

  getHostClientId(instanceId: string): string | null {
    return this.instances.get(instanceId)?.hostClientId ?? null;
  }
}
