import { Request, Response } from 'express';
import authService from '../services/auth';
import logger from '../services/logger';
import { 
  LoginRequest, 
  RegisterRequest, 
  RefreshTokenRequest, 
  ChangePasswordRequest,
  ForgotPasswordRequest,
  ResetPasswordRequest,
  AuthErrorCode 
} from '../types/auth';

export class AuthController {
  async register(req: Request, res: Response): Promise<void> {
    try {
      const userData: RegisterRequest = req.body;

      // Validate required fields
      if (!userData.email || !userData.password || !userData.firstName || !userData.lastName) {
        res.status(400).json({
          error: 'Validation error',
          message: 'Email, password, first name, and last name are required'
        });
        return;
      }

      // Validate email format
      const emailRegex = /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/;
      if (!emailRegex.test(userData.email)) {
        res.status(400).json({
          error: 'Validation error',
          message: 'Invalid email format'
        });
        return;
      }

      const result = await authService.register(userData);

      logger.info('User registration successful', {
        userId: result.user.id,
        email: result.user.email,
        role: result.user.role
      });

      res.status(201).json(result);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      logger.error('User registration failed', {
        error: errorMessage,
        email: req.body.email
      });

      if (errorMessage === AuthErrorCode.USER_ALREADY_EXISTS) {
        res.status(409).json({
          error: 'User already exists',
          message: 'An account with this email already exists'
        });
      } else if (errorMessage === AuthErrorCode.PASSWORD_TOO_WEAK) {
        res.status(400).json({
          error: 'Password too weak',
          message: 'Password must be at least 8 characters long and contain uppercase, lowercase, number, and special character'
        });
      } else {
        res.status(500).json({
          error: 'Registration failed',
          message: 'Internal server error'
        });
      }
    }
  }

  async login(req: Request, res: Response): Promise<void> {
    try {
      const credentials: LoginRequest = req.body;

      // Validate required fields
      if (!credentials.email || !credentials.password) {
        res.status(400).json({
          error: 'Validation error',
          message: 'Email and password are required'
        });
        return;
      }

      const result = await authService.login(credentials);

      logger.info('User login successful', {
        userId: result.user.id,
        email: result.user.email,
        role: result.user.role
      });

      res.json(result);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      logger.error('User login failed', {
        error: errorMessage,
        email: req.body.email,
        ip: req.ip
      });

      if (errorMessage === AuthErrorCode.INVALID_CREDENTIALS) {
        res.status(401).json({
          error: 'Invalid credentials',
          message: 'Email or password is incorrect'
        });
      } else if (errorMessage === AuthErrorCode.ACCOUNT_DISABLED) {
        res.status(403).json({
          error: 'Account disabled',
          message: 'Your account has been disabled'
        });
      } else {
        res.status(500).json({
          error: 'Login failed',
          message: 'Internal server error'
        });
      }
    }
  }

  async refreshToken(req: Request, res: Response): Promise<void> {
    try {
      const { refreshToken }: RefreshTokenRequest = req.body;

      if (!refreshToken) {
        res.status(400).json({
          error: 'Validation error',
          message: 'Refresh token is required'
        });
        return;
      }

      const result = await authService.refreshToken(refreshToken);

      logger.info('Token refresh successful', {
        refreshToken: refreshToken.substring(0, 10) + '...'
      });

      res.json(result);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      logger.error('Token refresh failed', {
        error: errorMessage,
        refreshToken: req.body.refreshToken?.substring(0, 10) + '...'
      });

      if (errorMessage === AuthErrorCode.INVALID_TOKEN) {
        res.status(401).json({
          error: 'Invalid token',
          message: 'Refresh token is invalid or expired'
        });
      } else {
        res.status(500).json({
          error: 'Token refresh failed',
          message: 'Internal server error'
        });
      }
    }
  }

  async logout(req: Request, res: Response): Promise<void> {
    try {
      const { refreshToken } = req.body;
      const userId = (req as any).user?.id;

      if (!userId) {
        res.status(401).json({
          error: 'Authentication required',
          message: 'User must be authenticated'
        });
        return;
      }

      if (refreshToken) {
        await authService.logout(userId, refreshToken);
      }

      logger.info('User logout successful', {
        userId
      });

      res.json({
        message: 'Logged out successfully'
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      logger.error('User logout failed', {
        error: errorMessage,
        userId: (req as any).user?.id
      });

      res.status(500).json({
        error: 'Logout failed',
        message: 'Internal server error'
      });
    }
  }

  async changePassword(req: Request, res: Response): Promise<void> {
    try {
      const passwords: ChangePasswordRequest = req.body;
      const userId = (req as any).user?.id;

      if (!userId) {
        res.status(401).json({
          error: 'Authentication required',
          message: 'User must be authenticated'
        });
        return;
      }

      // Validate required fields
      if (!passwords.currentPassword || !passwords.newPassword) {
        res.status(400).json({
          error: 'Validation error',
          message: 'Current password and new password are required'
        });
        return;
      }

      await authService.changePassword(userId, passwords);

      logger.info('Password change successful', {
        userId
      });

      res.json({
        message: 'Password changed successfully'
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      logger.error('Password change failed', {
        error: errorMessage,
        userId: (req as any).user?.id
      });

      if (errorMessage === AuthErrorCode.INVALID_CREDENTIALS) {
        res.status(400).json({
          error: 'Invalid current password',
          message: 'Current password is incorrect'
        });
      } else if (errorMessage === AuthErrorCode.PASSWORD_TOO_WEAK) {
        res.status(400).json({
          error: 'Password too weak',
          message: 'New password must be at least 8 characters long and contain uppercase, lowercase, number, and special character'
        });
      } else {
        res.status(500).json({
          error: 'Password change failed',
          message: 'Internal server error'
        });
      }
    }
  }

  async forgotPassword(req: Request, res: Response): Promise<void> {
    try {
      const { email }: ForgotPasswordRequest = req.body;

      if (!email) {
        res.status(400).json({
          error: 'Validation error',
          message: 'Email is required'
        });
        return;
      }

      await authService.forgotPassword(email);

      // Always return success to prevent email enumeration
      res.json({
        message: 'If an account with that email exists, a password reset link has been sent'
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      logger.error('Forgot password failed', {
        error: errorMessage,
        email: req.body.email
      });

      res.status(500).json({
        error: 'Password reset failed',
        message: 'Internal server error'
      });
    }
  }

  async resetPassword(req: Request, res: Response): Promise<void> {
    try {
      const { token, newPassword }: ResetPasswordRequest = req.body;

      if (!token || !newPassword) {
        res.status(400).json({
          error: 'Validation error',
          message: 'Token and new password are required'
        });
        return;
      }

      await authService.resetPassword(token, newPassword);

      logger.info('Password reset successful', {
        token: token.substring(0, 10) + '...'
      });

      res.json({
        message: 'Password reset successfully'
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      logger.error('Password reset failed', {
        error: errorMessage,
        token: req.body.token?.substring(0, 10) + '...'
      });

      if (errorMessage === AuthErrorCode.PASSWORD_TOO_WEAK) {
        res.status(400).json({
          error: 'Password too weak',
          message: 'New password must be at least 8 characters long and contain uppercase, lowercase, number, and special character'
        });
      } else {
        res.status(500).json({
          error: 'Password reset failed',
          message: 'Internal server error'
        });
      }
    }
  }

  async getProfile(req: Request, res: Response): Promise<void> {
    try {
      const user = (req as any).user;

      if (!user) {
        res.status(401).json({
          error: 'Authentication required',
          message: 'User must be authenticated'
        });
        return;
      }

      res.json({
        user: {
          id: user.id,
          email: user.email,
          role: user.role
        }
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      logger.error('Get profile failed', {
        error: errorMessage,
        userId: (req as any).user?.id
      });

      res.status(500).json({
        error: 'Get profile failed',
        message: 'Internal server error'
      });
    }
  }
}