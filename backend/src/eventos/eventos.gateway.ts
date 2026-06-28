import { WebSocketGateway, WebSocketServer, OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';

@WebSocketGateway({ cors: { origin: '*' } })
export class EventosGateway implements OnGatewayConnection, OnGatewayDisconnect {

  private readonly logger = new Logger(EventosGateway.name);

  @WebSocketServer()
  server!: Server;

  handleConnection(client: Socket) {
    this.logger.log(`Frontend conectado. ID del cliente: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Frontend desconectado. ID del cliente: ${client.id}`);
  }

  emitirDatosDelSensor(datosSensor: any) {
    this.server.emit('nuevos-datos-iot', datosSensor);
    this.logger.debug('Datos empujados al frontend en tiempo real');
  }
}