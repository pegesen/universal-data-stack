import { PermissionService, Permission, UserRole } from '../types/auth';

export class PermissionService implements PermissionService {
  private rolePermissions: Record<UserRole, Permission[]> = {
    [UserRole.ADMIN]: [
      { resource: 'users', actions: ['create', 'read', 'update', 'delete'] },
      { resource: 'collections', actions: ['create', 'read', 'update', 'delete'] },
      { resource: 'documents', actions: ['create', 'read', 'update', 'delete'] },
      { resource: 'sessions', actions: ['read', 'delete'] },
      { resource: 'metrics', actions: ['read'] },
      { resource: 'settings', actions: ['read', 'update'] }
    ],
    [UserRole.USER]: [
      { resource: 'collections', actions: ['read'] },
      { resource: 'documents', actions: ['create', 'read', 'update', 'delete'] },
      { resource: 'profile', actions: ['read', 'update'] }
    ],
    [UserRole.READONLY]: [
      { resource: 'collections', actions: ['read'] },
      { resource: 'documents', actions: ['read'] },
      { resource: 'profile', actions: ['read'] }
    ]
  };

  hasPermission(userRole: UserRole, resource: string, action: string): boolean {
    const permissions = this.rolePermissions[userRole];
    if (!permissions) return false;

    const resourcePermission = permissions.find(p => p.resource === resource);
    if (!resourcePermission) return false;

    return resourcePermission.actions.includes(action);
  }

  getUserPermissions(userRole: UserRole): Permission[] {
    return this.rolePermissions[userRole] || [];
  }

  checkResourceAccess(userRole: UserRole, resource: string, action: string): boolean {
    // Admin has access to everything
    if (userRole === UserRole.ADMIN) return true;

    return this.hasPermission(userRole, resource, action);
  }

  // Collection-specific permissions
  canAccessCollection(userRole: UserRole, collectionName: string): boolean {
    // Admin can access all collections
    if (userRole === UserRole.ADMIN) return true;

    // Users and readonly can access collections
    return this.hasPermission(userRole, 'collections', 'read');
  }

  canCreateCollection(userRole: UserRole): boolean {
    return this.hasPermission(userRole, 'collections', 'create');
  }

  canDeleteCollection(userRole: UserRole): boolean {
    return this.hasPermission(userRole, 'collections', 'delete');
  }

  // Document-specific permissions
  canAccessDocuments(userRole: UserRole, collectionName: string): boolean {
    // Admin can access all documents
    if (userRole === UserRole.ADMIN) return true;

    // Check if user can read documents
    return this.hasPermission(userRole, 'documents', 'read');
  }

  canCreateDocument(userRole: UserRole, collectionName: string): boolean {
    // Admin can create documents in any collection
    if (userRole === UserRole.ADMIN) return true;

    // Check if user can create documents
    return this.hasPermission(userRole, 'documents', 'create');
  }

  canUpdateDocument(userRole: UserRole, collectionName: string): boolean {
    // Admin can update documents in any collection
    if (userRole === UserRole.ADMIN) return true;

    // Check if user can update documents
    return this.hasPermission(userRole, 'documents', 'update');
  }

  canDeleteDocument(userRole: UserRole, collectionName: string): boolean {
    // Admin can delete documents in any collection
    if (userRole === UserRole.ADMIN) return true;

    // Check if user can delete documents
    return this.hasPermission(userRole, 'documents', 'delete');
  }

  // User management permissions
  canManageUsers(userRole: UserRole): boolean {
    return this.hasPermission(userRole, 'users', 'create') && 
           this.hasPermission(userRole, 'users', 'update') && 
           this.hasPermission(userRole, 'users', 'delete');
  }

  canViewUsers(userRole: UserRole): boolean {
    return this.hasPermission(userRole, 'users', 'read');
  }

  // Session management permissions
  canManageSessions(userRole: UserRole): boolean {
    return this.hasPermission(userRole, 'sessions', 'delete');
  }

  canViewSessions(userRole: UserRole): boolean {
    return this.hasPermission(userRole, 'sessions', 'read');
  }

  // Metrics permissions
  canViewMetrics(userRole: UserRole): boolean {
    return this.hasPermission(userRole, 'metrics', 'read');
  }

  // Settings permissions
  canManageSettings(userRole: UserRole): boolean {
    return this.hasPermission(userRole, 'settings', 'update');
  }

  canViewSettings(userRole: UserRole): boolean {
    return this.hasPermission(userRole, 'settings', 'read');
  }

  // Profile permissions
  canViewProfile(userRole: UserRole, targetUserId: string, currentUserId: string): boolean {
    // Users can always view their own profile
    if (targetUserId === currentUserId) return true;

    // Admin can view any profile
    if (userRole === UserRole.ADMIN) return true;

    // Check if user can read profiles
    return this.hasPermission(userRole, 'profile', 'read');
  }

  canUpdateProfile(userRole: UserRole, targetUserId: string, currentUserId: string): boolean {
    // Users can always update their own profile
    if (targetUserId === currentUserId) return true;

    // Admin can update any profile
    if (userRole === UserRole.ADMIN) return true;

    // Check if user can update profiles
    return this.hasPermission(userRole, 'profile', 'update');
  }

  // Get all resources a user can access
  getAccessibleResources(userRole: UserRole): string[] {
    const permissions = this.getUserPermissions(userRole);
    return permissions.map(p => p.resource);
  }

  // Get all actions a user can perform on a resource
  getResourceActions(userRole: UserRole, resource: string): string[] {
    const permissions = this.getUserPermissions(userRole);
    const resourcePermission = permissions.find(p => p.resource === resource);
    return resourcePermission ? resourcePermission.actions : [];
  }
}

export default new PermissionService();