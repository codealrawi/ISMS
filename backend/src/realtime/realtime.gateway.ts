import {
  OnGatewayConnection,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

export type RealtimeEvent =
  | 'location:created'
  | 'location:updated'
  | 'location:deleted';

/**
 * Real-time channel for map clients. Currently broadcasts CRUD
 * events on locations; designed to also carry live traffic /
 * sensor feeds later (same room-based fan-out).
 */
@WebSocketGateway({ cors: { origin: true } })
export class RealtimeGateway implements OnGatewayConnection {
  @WebSocketServer()
  server: Server;

  handleConnection(client: Socket) {
    client.emit('connected', { at: new Date().toISOString() });
  }

  broadcast(event: RealtimeEvent, payload: unknown) {
    this.server?.emit(event, payload);
  }
}
