import { Server as SocketIOServer } from 'socket.io';
import { Server as HTTPServer } from 'http';
import jwt from 'jsonwebtoken';
import authService from './auth';
import permissionService from './permissions';
import logger from './logger';
import { 
  WebSocketService, 
  AuthenticatedSocket, 
  SocketEvents, 
  DocumentEventData, 
  CollectionEventData, 
  UserEventData, 
  NotificationData,
  UserRole 
} from '../types/websocket';

export class WebSocketService implements WebSocketService {
  private io: SocketIOServer<SocketEvents> | null = null;
  private connectedUsers: Map<string, AuthenticatedSocket> = new Map();
  private userRooms: Map<string, Set<string>> = new Map();

  initialize(server: HTTPServer): void {
    this.io = new SocketIOServer(server, {
      cors: {
        origin: process.env.CORS_ORIGIN || process.env.FRONTEND_URL || 'http://localhost:8080',
        credentials: true
      },
      pingTimeout: 60000,
      pingInterval: 25000,
      maxHttpBufferSize: 1e6,
      allowEIO3: true,
      transports: ['websocket', 'polling']
    });

    this.setupMiddleware();
    this.setupEventHandlers();

    logger.info('WebSocket server initialized');
  }

  private setupMiddleware(): void {
    if (!this.io) return;

    // Authentication middleware
    this.io.use(async (socket: AuthenticatedSocket, next) => {
      try {
        const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace('Bearer ', '');
        
        if (!token) {
          return next(new Error('Authentication required'));
        }

        const payload = await authService.verifyToken(token);
        socket.user = {
          id: payload.userId,
          email: payload.email,
          role: payload.role
        };

        next();
      } catch (error) {
        logger.warn('WebSocket authentication failed', {
          error: error instanceof Error ? error.message : 'Unknown error',
          socketId: socket.id
        });
        next(new Error('Authentication failed'));
      }
    });

    // Rate limiting middleware
    this.io.use((socket: AuthenticatedSocket, next) => {
      // Simple rate limiting - in production, use Redis-based rate limiting
      const userId = socket.user?.id;
      if (userId && this.connectedUsers.has(userId)) {
        // User already connected, disconnect previous connection
        const existingSocket = this.connectedUsers.get(userId);
        if (existingSocket) {
          existingSocket.disconnect(true);
        }
      }
      next();
    });
  }

  private setupEventHandlers(): void {
    if (!this.io) return;

    this.io.on('connection', (socket: AuthenticatedSocket) => {
      this.handleConnection(socket);
    });
  }

  private handleConnection(socket: AuthenticatedSocket): void {
    const user = socket.user;
    if (!user) return;

    // Store user connection
    this.connectedUsers.set(user.id, socket);
    this.userRooms.set(user.id, new Set());

    // Join user to their personal room
    socket.join(`user:${user.id}`);

    // Join admin room if user is admin
    if (user.role === UserRole.ADMIN) {
      socket.join('admin');
    }

    logger.info('User connected via WebSocket', {
      userId: user.id,
      email: user.email,
      role: user.role,
      socketId: socket.id
    });

    // Broadcast user online status
    this.broadcastUserStatus(user.id, 'online');

    // Setup event handlers
    this.setupSocketEventHandlers(socket);

    // Handle disconnection
    socket.on('disconnect', () => {
      this.handleDisconnection(socket);
    });
  }

  private setupSocketEventHandlers(socket: AuthenticatedSocket): void {
    const user = socket.user;
    if (!user) return;

    // Join collection room
    socket.on('join:collection', (collectionName: string) => {
      this.handleJoinCollection(socket, collectionName);
    });

    // Leave collection room
    socket.on('leave:collection', (collectionName: string) => {
      this.handleLeaveCollection(socket, collectionName);
    });

    // Subscribe to document updates
    socket.on('subscribe:document', (documentId: string) => {
      this.handleSubscribeDocument(socket, documentId);
    });

    // Unsubscribe from document updates
    socket.on('unsubscribe:document', (documentId: string) => {
      this.handleUnsubscribeDocument(socket, documentId);
    });

    // Subscribe to user updates
    socket.on('subscribe:user', (userId: string) => {
      this.handleSubscribeUser(socket, userId);
    });

    // Unsubscribe from user updates
    socket.on('unsubscribe:user', (userId: string) => {
      this.handleUnsubscribeUser(socket, userId);
    });

    // Ping handler
    socket.on('ping', () => {
      socket.emit('pong');
    });
  }

  private handleJoinCollection(socket: AuthenticatedSocket, collectionName: string): void {
    const user = socket.user;
    if (!user) return;

    // Check permissions
    if (!permissionService.canAccessCollection(user.role, collectionName)) {
      socket.emit('error', {
        code: 'PERMISSION_DENIED',
        message: 'Insufficient permissions to access this collection',
        timestamp: new Date().toISOString()
      });
      return;
    }

    const roomName = `collection:${collectionName}`;
    socket.join(roomName);
    
    const userRooms = this.userRooms.get(user.id) || new Set();
    userRooms.add(roomName);
    this.userRooms.set(user.id, userRooms);

    logger.debug('User joined collection room', {
      userId: user.id,
      collection: collectionName,
      room: roomName
    });
  }

  private handleLeaveCollection(socket: AuthenticatedSocket, collectionName: string): void {
    const user = socket.user;
    if (!user) return;

    const roomName = `collection:${collectionName}`;
    socket.leave(roomName);
    
    const userRooms = this.userRooms.get(user.id) || new Set();
    userRooms.delete(roomName);
    this.userRooms.set(user.id, userRooms);

    logger.debug('User left collection room', {
      userId: user.id,
      collection: collectionName,
      room: roomName
    });
  }

  private handleSubscribeDocument(socket: AuthenticatedSocket, documentId: string): void {
    const user = socket.user;
    if (!user) return;

    const roomName = `document:${documentId}`;
    socket.join(roomName);
    
    const userRooms = this.userRooms.get(user.id) || new Set();
    userRooms.add(roomName);
    this.userRooms.set(user.id, userRooms);

    logger.debug('User subscribed to document', {
      userId: user.id,
      documentId,
      room: roomName
    });
  }

  private handleUnsubscribeDocument(socket: AuthenticatedSocket, documentId: string): void {
    const user = socket.user;
    if (!user) return;

    const roomName = `document:${documentId}`;
    socket.leave(roomName);
    
    const userRooms = this.userRooms.get(user.id) || new Set();
    userRooms.delete(roomName);
    this.userRooms.set(user.id, userRooms);

    logger.debug('User unsubscribed from document', {
      userId: user.id,
      documentId,
      room: roomName
    });
  }

  private handleSubscribeUser(socket: AuthenticatedSocket, userId: string): void {
    const user = socket.user;
    if (!user) return;

    // Only allow subscribing to own user updates or admin can subscribe to any
    if (user.id !== userId && user.role !== UserRole.ADMIN) {
      socket.emit('error', {
        code: 'PERMISSION_DENIED',
        message: 'Insufficient permissions to subscribe to this user',
        timestamp: new Date().toISOString()
      });
      return;
    }

    const roomName = `user:${userId}`;
    socket.join(roomName);
    
    const userRooms = this.userRooms.get(user.id) || new Set();
    userRooms.add(roomName);
    this.userRooms.set(user.id, userRooms);

    logger.debug('User subscribed to user updates', {
      userId: user.id,
      targetUserId: userId,
      room: roomName
    });
  }

  private handleUnsubscribeUser(socket: AuthenticatedSocket, userId: string): void {
    const user = socket.user;
    if (!user) return;

    const roomName = `user:${userId}`;
    socket.leave(roomName);
    
    const userRooms = this.userRooms.get(user.id) || new Set();
    userRooms.delete(roomName);
    this.userRooms.set(user.id, userRooms);

    logger.debug('User unsubscribed from user updates', {
      userId: user.id,
      targetUserId: userId,
      room: roomName
    });
  }

  private handleDisconnection(socket: AuthenticatedSocket): void {
    const user = socket.user;
    if (!user) return;

    // Remove user connection
    this.connectedUsers.delete(user.id);
    this.userRooms.delete(user.id);

    logger.info('User disconnected from WebSocket', {
      userId: user.id,
      email: user.email,
      socketId: socket.id
    });

    // Broadcast user offline status
    this.broadcastUserStatus(user.id, 'offline');
  }

  // Public methods for emitting events
  emitToUser(userId: string, event: string, data: any): void {
    if (!this.io) return;

    const socket = this.connectedUsers.get(userId);
    if (socket) {
      socket.emit(event as any, data);
    }
  }

  emitToCollection(collectionName: string, event: string, data: any): void {
    if (!this.io) return;

    this.io.to(`collection:${collectionName}`).emit(event as any, data);
  }

  emitToDocument(collectionName: string, documentId: string, event: string, data: any): void {
    if (!this.io) return;

    this.io.to(`document:${documentId}`).emit(event as any, data);
  }

  emitToAdmins(event: string, data: any): void {
    if (!this.io) return;

    this.io.to('admin').emit(event as any, data);
  }

  emitToAll(event: string, data: any): void {
    if (!this.io) return;

    this.io.emit(event as any, data);
  }

  joinRoom(socket: AuthenticatedSocket, roomName: string): void {
    socket.join(roomName);
    
    const user = socket.user;
    if (user) {
      const userRooms = this.userRooms.get(user.id) || new Set();
      userRooms.add(roomName);
      this.userRooms.set(user.id, userRooms);
    }
  }

  leaveRoom(socket: AuthenticatedSocket, roomName: string): void {
    socket.leave(roomName);
    
    const user = socket.user;
    if (user) {
      const userRooms = this.userRooms.get(user.id) || new Set();
      userRooms.delete(roomName);
      this.userRooms.set(user.id, userRooms);
    }
  }

  getOnlineUsers(): string[] {
    return Array.from(this.connectedUsers.keys());
  }

  isUserOnline(userId: string): boolean {
    return this.connectedUsers.has(userId);
  }

  broadcastUserStatus(userId: string, status: 'online' | 'offline'): void {
    if (!this.io) return;

    const userData: UserEventData = {
      userId,
      email: '', // Will be filled by the client
      role: UserRole.USER, // Will be filled by the client
      timestamp: new Date().toISOString(),
      status
    };

    this.io.emit('user:online', userData);
  }

  // Document event methods
  emitDocumentCreated(collectionName: string, document: any, userId: string): void {
    const eventData: DocumentEventData = {
      collection: collectionName,
      document,
      userId,
      timestamp: new Date().toISOString(),
      operation: 'create'
    };

    this.emitToCollection(collectionName, 'document:created', eventData);
  }

  emitDocumentUpdated(collectionName: string, document: any, userId: string): void {
    const eventData: DocumentEventData = {
      collection: collectionName,
      document,
      userId,
      timestamp: new Date().toISOString(),
      operation: 'update'
    };

    this.emitToCollection(collectionName, 'document:updated', eventData);
    this.emitToDocument(collectionName, document._id, 'document:updated', eventData);
  }

  emitDocumentDeleted(collectionName: string, documentId: string, userId: string): void {
    const eventData: DocumentEventData = {
      collection: collectionName,
      document: { _id: documentId },
      userId,
      timestamp: new Date().toISOString(),
      operation: 'delete'
    };

    this.emitToCollection(collectionName, 'document:deleted', eventData);
    this.emitToDocument(collectionName, documentId, 'document:deleted', eventData);
  }

  // Collection event methods
  emitCollectionUpdated(collectionName: string, operation: 'create' | 'update' | 'delete', userId: string, metadata?: any): void {
    const eventData: CollectionEventData = {
      collection: collectionName,
      operation,
      userId,
      timestamp: new Date().toISOString(),
      metadata
    };

    this.emitToAll('collection:updated', eventData);
  }

  // Notification methods
  emitNotification(userId: string, notification: Omit<NotificationData, 'id' | 'timestamp' | 'read'>): void {
    const notificationData: NotificationData = {
      ...notification,
      id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      read: false
    };

    this.emitToUser(userId, 'notification', notificationData);
  }
}

export default new WebSocketService();