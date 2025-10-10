import { Socket } from 'socket.io';
import { UserRole } from './auth';

// WebSocket Event Types
export interface SocketEvents {
  // Client to Server
  'join:collection': (collectionName: string) => void;
  'leave:collection': (collectionName: string) => void;
  'subscribe:document': (documentId: string) => void;
  'unsubscribe:document': (documentId: string) => void;
  'subscribe:user': (userId: string) => void;
  'unsubscribe:user': (userId: string) => void;
  'ping': () => void;
  
  // Server to Client
  'pong': () => void;
  'document:created': (data: DocumentEventData) => void;
  'document:updated': (data: DocumentEventData) => void;
  'document:deleted': (data: DocumentEventData) => void;
  'collection:updated': (data: CollectionEventData) => void;
  'user:online': (data: UserEventData) => void;
  'user:offline': (data: UserEventData) => void;
  'notification': (data: NotificationData) => void;
  'error': (data: ErrorData) => void;
}

// Event Data Types
export interface DocumentEventData {
  collection: string;
  document: any;
  userId: string;
  timestamp: string;
  operation: 'create' | 'update' | 'delete';
}

export interface CollectionEventData {
  collection: string;
  operation: 'create' | 'update' | 'delete';
  userId: string;
  timestamp: string;
  metadata?: any;
}

export interface UserEventData {
  userId: string;
  email: string;
  role: UserRole;
  timestamp: string;
  status: 'online' | 'offline';
}

export interface NotificationData {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  userId: string;
  timestamp: string;
  read: boolean;
  data?: any;
}

export interface ErrorData {
  code: string;
  message: string;
  timestamp: string;
}

// Socket Room Types
export interface SocketRoom {
  name: string;
  type: 'collection' | 'document' | 'user' | 'admin';
  users: Set<string>;
  createdAt: Date;
}

// Authenticated Socket
export interface AuthenticatedSocket extends Socket {
  user?: {
    id: string;
    email: string;
    role: UserRole;
  };
  rooms: Set<string>;
}

// WebSocket Service Types
export interface WebSocketService {
  initialize(server: any): void;
  emitToUser(userId: string, event: string, data: any): void;
  emitToCollection(collectionName: string, event: string, data: any): void;
  emitToDocument(collectionName: string, documentId: string, event: string, data: any): void;
  emitToAdmins(event: string, data: any): void;
  emitToAll(event: string, data: any): void;
  joinRoom(socket: AuthenticatedSocket, roomName: string): void;
  leaveRoom(socket: AuthenticatedSocket, roomName: string): void;
  getOnlineUsers(): string[];
  isUserOnline(userId: string): boolean;
  broadcastUserStatus(userId: string, status: 'online' | 'offline'): void;
}

// Notification Service Types
export interface NotificationService {
  createNotification(notification: Omit<NotificationData, 'id' | 'timestamp' | 'read'>): Promise<NotificationData>;
  getUserNotifications(userId: string, limit?: number, offset?: number): Promise<NotificationData[]>;
  markAsRead(notificationId: string, userId: string): Promise<void>;
  markAllAsRead(userId: string): Promise<void>;
  deleteNotification(notificationId: string, userId: string): Promise<void>;
  getUnreadCount(userId: string): Promise<number>;
}

// Real-time Event Types
export interface RealTimeEvent {
  id: string;
  type: string;
  data: any;
  userId: string;
  timestamp: string;
  collection?: string;
  documentId?: string;
}

// WebSocket Middleware Types
export interface SocketMiddleware {
  authenticate(): (socket: Socket, next: (err?: Error) => void) => void;
  authorize(requiredRole?: UserRole): (socket: AuthenticatedSocket, next: (err?: Error) => void) => void;
  rateLimit(): (socket: Socket, next: (err?: Error) => void) => void;
  logEvents(): (socket: Socket, next: (err?: Error) => void) => void;
}

// Connection State Types
export interface ConnectionState {
  userId: string;
  socketId: string;
  connectedAt: Date;
  lastActivity: Date;
  rooms: string[];
  userAgent?: string;
  ipAddress?: string;
}

// WebSocket Configuration
export interface WebSocketConfig {
  cors: {
    origin: string | string[];
    credentials: boolean;
  };
  pingTimeout: number;
  pingInterval: number;
  maxHttpBufferSize: number;
  allowEIO3: boolean;
  transports: string[];
}

// Event Handlers
export interface EventHandlers {
  onConnection: (socket: AuthenticatedSocket) => void;
  onDisconnection: (socket: AuthenticatedSocket) => void;
  onJoinCollection: (socket: AuthenticatedSocket, collectionName: string) => void;
  onLeaveCollection: (socket: AuthenticatedSocket, collectionName: string) => void;
  onSubscribeDocument: (socket: AuthenticatedSocket, documentId: string) => void;
  onUnsubscribeDocument: (socket: AuthenticatedSocket, documentId: string) => void;
  onPing: (socket: AuthenticatedSocket) => void;
}

// Room Management
export interface RoomManager {
  createRoom(name: string, type: 'collection' | 'document' | 'user' | 'admin'): SocketRoom;
  joinRoom(socket: AuthenticatedSocket, roomName: string): void;
  leaveRoom(socket: AuthenticatedSocket, roomName: string): void;
  getRoom(roomName: string): SocketRoom | undefined;
  getRoomsByType(type: string): SocketRoom[];
  getUserRooms(userId: string): string[];
  cleanupEmptyRooms(): void;
}