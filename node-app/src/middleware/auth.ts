import { Request, Response, NextFunction } from 'express';
import authService from '../services/auth';
import permissionService from '../services/permissions';
import logger from '../services/logger';
import { AuthenticatedRequest, UserRole, AuthErrorCode } from '../types/auth';

export class AuthMiddleware {
  // JWT Authentication middleware
  authenticate() {
    return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
      try {
        const authHeader = req.headers.authorization;
        
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
          return res.status(401).json({
            error: 'Authentication required',
            message: 'No valid authorization header found'
          });
        }

        const token = authHeader.substring(7); // Remove 'Bearer ' prefix
        
        try {
          const payload = await authService.verifyToken(token);
          
          // Add user info to request
          req.user = {
            id: payload.userId,
            email: payload.email,
            role: payload.role
          };

          logger.debug('User authenticated', {
            userId: payload.userId,
            email: payload.email,
            role: payload.role,
            url: req.originalUrl
          });

          next();
        } catch (tokenError) {
          logger.warn('Invalid token provided', {
            error: tokenError instanceof Error ? tokenError.message : 'Unknown error',
            url: req.originalUrl,
            ip: req.ip
          });

          return res.status(401).json({
            error: 'Invalid token',
            message: 'Token is invalid or expired'
          });
        }
      } catch (error) {
        logger.error('Authentication middleware error', {
          error: error instanceof Error ? error.message : 'Unknown error',
          url: req.originalUrl
        });

        return res.status(500).json({
          error: 'Authentication error',
          message: 'Internal server error'
        });
      }
    };
  }

  // Optional authentication middleware (doesn't fail if no token)
  optionalAuth() {
    return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
      try {
        const authHeader = req.headers.authorization;
        
        if (authHeader && authHeader.startsWith('Bearer ')) {
          const token = authHeader.substring(7);
          
          try {
            const payload = await authService.verifyToken(token);
            req.user = {
              id: payload.userId,
              email: payload.email,
              role: payload.role
            };
          } catch (tokenError) {
            // Ignore token errors in optional auth
            logger.debug('Optional auth token invalid', {
              error: tokenError instanceof Error ? tokenError.message : 'Unknown error'
            });
          }
        }

        next();
      } catch (error) {
        logger.error('Optional authentication middleware error', {
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        next();
      }
    };
  }

  // Role-based authorization middleware
  requireRole(requiredRoles: UserRole | UserRole[]) {
    return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
      if (!req.user) {
        return res.status(401).json({
          error: 'Authentication required',
          message: 'User must be authenticated'
        });
      }

      const userRole = req.user.role;
      const roles = Array.isArray(requiredRoles) ? requiredRoles : [requiredRoles];

      if (!roles.includes(userRole)) {
        logger.warn('Insufficient permissions', {
          userId: req.user.id,
          userRole,
          requiredRoles,
          url: req.originalUrl
        });

        return res.status(403).json({
          error: 'Insufficient permissions',
          message: `Required role: ${roles.join(' or ')}`
        });
      }

      next();
    };
  }

  // Permission-based authorization middleware
  requirePermission(resource: string, action: string) {
    return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
      if (!req.user) {
        return res.status(401).json({
          error: 'Authentication required',
          message: 'User must be authenticated'
        });
      }

      const hasPermission = permissionService.checkResourceAccess(
        req.user.role,
        resource,
        action
      );

      if (!hasPermission) {
        logger.warn('Permission denied', {
          userId: req.user.id,
          userRole: req.user.role,
          resource,
          action,
          url: req.originalUrl
        });

        return res.status(403).json({
          error: 'Permission denied',
          message: `Insufficient permissions for ${action} on ${resource}`
        });
      }

      next();
    };
  }

  // Collection access middleware
  requireCollectionAccess(action: string) {
    return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
      if (!req.user) {
        return res.status(401).json({
          error: 'Authentication required',
          message: 'User must be authenticated'
        });
      }

      const collectionName = req.params.collection;
      if (!collectionName) {
        return res.status(400).json({
          error: 'Invalid request',
          message: 'Collection name is required'
        });
      }

      let hasPermission = false;

      switch (action) {
        case 'read':
          hasPermission = permissionService.canAccessCollection(req.user.role, collectionName);
          break;
        case 'create':
          hasPermission = permissionService.canCreateCollection(req.user.role);
          break;
        case 'update':
          hasPermission = permissionService.canUpdateDocument(req.user.role, collectionName);
          break;
        case 'delete':
          hasPermission = permissionService.canDeleteCollection(req.user.role);
          break;
        default:
          hasPermission = false;
      }

      if (!hasPermission) {
        logger.warn('Collection access denied', {
          userId: req.user.id,
          userRole: req.user.role,
          collection: collectionName,
          action,
          url: req.originalUrl
        });

        return res.status(403).json({
          error: 'Access denied',
          message: `Insufficient permissions for ${action} on collection ${collectionName}`
        });
      }

      next();
    };
  }

  // Document access middleware
  requireDocumentAccess(action: string) {
    return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
      if (!req.user) {
        return res.status(401).json({
          error: 'Authentication required',
          message: 'User must be authenticated'
        });
      }

      const collectionName = req.params.collection;
      if (!collectionName) {
        return res.status(400).json({
          error: 'Invalid request',
          message: 'Collection name is required'
        });
      }

      let hasPermission = false;

      switch (action) {
        case 'read':
          hasPermission = permissionService.canAccessDocuments(req.user.role, collectionName);
          break;
        case 'create':
          hasPermission = permissionService.canCreateDocument(req.user.role, collectionName);
          break;
        case 'update':
          hasPermission = permissionService.canUpdateDocument(req.user.role, collectionName);
          break;
        case 'delete':
          hasPermission = permissionService.canDeleteDocument(req.user.role, collectionName);
          break;
        default:
          hasPermission = false;
      }

      if (!hasPermission) {
        logger.warn('Document access denied', {
          userId: req.user.id,
          userRole: req.user.role,
          collection: collectionName,
          action,
          url: req.originalUrl
        });

        return res.status(403).json({
          error: 'Access denied',
          message: `Insufficient permissions for ${action} on documents in ${collectionName}`
        });
      }

      next();
    };
  }

  // Rate limiting for auth endpoints
  authRateLimit() {
    return (req: Request, res: Response, next: NextFunction) => {
      // This would integrate with your rate limiting middleware
      // For now, we'll just pass through
      next();
    };
  }

  // Logout middleware
  logout() {
    return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
      if (!req.user) {
        return res.status(401).json({
          error: 'Authentication required',
          message: 'User must be authenticated'
        });
      }

      try {
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
          const token = authHeader.substring(7);
          await authService.logout(req.user.id, token);
        }

        res.json({
          message: 'Logged out successfully'
        });
      } catch (error) {
        logger.error('Logout failed', {
          error: error instanceof Error ? error.message : 'Unknown error',
          userId: req.user.id
        });

        res.status(500).json({
          error: 'Logout failed',
          message: 'Internal server error'
        });
      }
    };
  }
}

export default new AuthMiddleware();