import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import User, { User as UserModel } from '../models/User';
import Session from '../models/Session';
import logger from './logger';
import { 
  AuthService, 
  LoginRequest, 
  RegisterRequest, 
  AuthResponse, 
  TokenPair, 
  JWTPayload, 
  ChangePasswordRequest,
  ForgotPasswordRequest,
  ResetPasswordRequest,
  UserRole,
  AuthErrorCode
} from '../types/auth';

export class AuthService implements AuthService {
  private jwtSecret: string;
  private jwtExpiresIn: string;
  private refreshTokenExpiresIn: number;

  constructor() {
    this.jwtSecret = process.env.JWT_SECRET || 'your-super-secret-jwt-key';
    this.jwtExpiresIn = process.env.JWT_EXPIRES_IN || '15m';
    this.refreshTokenExpiresIn = parseInt(process.env.REFRESH_TOKEN_EXPIRES_IN || '604800'); // 7 days
  }

  async register(userData: RegisterRequest): Promise<AuthResponse> {
    try {
      // Check if user already exists
      const existingUser = await User.findOne({ email: userData.email });
      if (existingUser) {
        throw new Error(AuthErrorCode.USER_ALREADY_EXISTS);
      }

      // Validate password strength
      this.validatePassword(userData.password);

      // Create new user
      const user = new User({
        email: userData.email,
        password: userData.password,
        firstName: userData.firstName,
        lastName: userData.lastName,
        role: userData.role || UserRole.USER
      });

      await user.save();

      logger.info('User registered successfully', {
        userId: user._id,
        email: user.email,
        role: user.role
      });

      // Generate tokens
      const tokens = await this.generateTokenPair(user._id.toString(), user.email, user.role);

      return {
        user: user.getPublicProfile(),
        token: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresIn: this.getTokenExpirationTime()
      };
    } catch (error) {
      logger.error('User registration failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        email: userData.email
      });
      throw error;
    }
  }

  async login(credentials: LoginRequest): Promise<AuthResponse> {
    try {
      // Find user with password
      const user = await User.findByEmail(credentials.email);
      if (!user) {
        throw new Error(AuthErrorCode.INVALID_CREDENTIALS);
      }

      // Check if user is active
      if (!user.isActive) {
        throw new Error(AuthErrorCode.ACCOUNT_DISABLED);
      }

      // Verify password
      const isPasswordValid = await user.comparePassword(credentials.password);
      if (!isPasswordValid) {
        throw new Error(AuthErrorCode.INVALID_CREDENTIALS);
      }

      // Update last login
      user.lastLogin = new Date();
      await user.save();

      // Generate tokens
      const tokens = await this.generateTokenPair(user._id.toString(), user.email, user.role);

      logger.info('User logged in successfully', {
        userId: user._id,
        email: user.email,
        role: user.role
      });

      return {
        user: user.getPublicProfile(),
        token: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresIn: this.getTokenExpirationTime()
      };
    } catch (error) {
      logger.error('User login failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        email: credentials.email
      });
      throw error;
    }
  }

  async refreshToken(refreshToken: string): Promise<TokenPair> {
    try {
      // Find active session
      const session = await Session.findActiveSession(refreshToken);
      if (!session) {
        throw new Error(AuthErrorCode.INVALID_TOKEN);
      }

      // Find user
      const user = await User.findById(session.userId);
      if (!user || !user.isActive) {
        throw new Error(AuthErrorCode.USER_NOT_FOUND);
      }

      // Generate new tokens
      const tokens = await this.generateTokenPair(user._id.toString(), user.email, user.role);

      // Update session with new refresh token
      session.refreshToken = tokens.refreshToken;
      session.expiresAt = new Date(Date.now() + this.refreshTokenExpiresIn * 1000);
      await session.save();

      logger.info('Token refreshed successfully', {
        userId: user._id,
        email: user.email
      });

      return tokens;
    } catch (error) {
      logger.error('Token refresh failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        refreshToken: refreshToken.substring(0, 10) + '...'
      });
      throw error;
    }
  }

  async logout(userId: string, refreshToken: string): Promise<void> {
    try {
      // Revoke specific session
      await Session.findOneAndUpdate(
        { userId, refreshToken, isActive: true },
        { isActive: false }
      );

      logger.info('User logged out successfully', {
        userId,
        refreshToken: refreshToken.substring(0, 10) + '...'
      });
    } catch (error) {
      logger.error('User logout failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId
      });
      throw error;
    }
  }

  async changePassword(userId: string, passwords: ChangePasswordRequest): Promise<void> {
    try {
      const user = await User.findById(userId).select('+password');
      if (!user) {
        throw new Error(AuthErrorCode.USER_NOT_FOUND);
      }

      // Verify current password
      const isCurrentPasswordValid = await user.comparePassword(passwords.currentPassword);
      if (!isCurrentPasswordValid) {
        throw new Error(AuthErrorCode.INVALID_CREDENTIALS);
      }

      // Validate new password
      this.validatePassword(passwords.newPassword);

      // Update password
      user.password = passwords.newPassword;
      await user.save();

      // Revoke all sessions except current one
      await this.revokeAllSessions(userId);

      logger.info('Password changed successfully', {
        userId
      });
    } catch (error) {
      logger.error('Password change failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId
      });
      throw error;
    }
  }

  async forgotPassword(email: string): Promise<void> {
    try {
      const user = await User.findOne({ email });
      if (!user) {
        // Don't reveal if user exists or not
        return;
      }

      // Generate reset token
      const resetToken = crypto.randomBytes(32).toString('hex');
      const resetTokenExpires = new Date(Date.now() + 3600000); // 1 hour

      // Store reset token (in a real app, you'd store this in a separate collection)
      // For now, we'll just log it
      logger.info('Password reset token generated', {
        userId: user._id,
        email: user.email,
        resetToken: resetToken.substring(0, 10) + '...',
        expiresAt: resetTokenExpires
      });

      // In a real app, send email with reset link
      // await emailService.sendPasswordResetEmail(user.email, resetToken);
    } catch (error) {
      logger.error('Forgot password failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        email
      });
      throw error;
    }
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    try {
      // In a real app, verify token from database
      // For now, we'll just validate the password
      this.validatePassword(newPassword);

      logger.info('Password reset completed', {
        token: token.substring(0, 10) + '...'
      });
    } catch (error) {
      logger.error('Password reset failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        token: token.substring(0, 10) + '...'
      });
      throw error;
    }
  }

  async verifyToken(token: string): Promise<JWTPayload> {
    try {
      const decoded = jwt.verify(token, this.jwtSecret) as JWTPayload;
      return decoded;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new Error(AuthErrorCode.TOKEN_EXPIRED);
      }
      throw new Error(AuthErrorCode.INVALID_TOKEN);
    }
  }

  async revokeAllSessions(userId: string): Promise<void> {
    try {
      await Session.revokeUserSessions(userId);
      logger.info('All user sessions revoked', { userId });
    } catch (error) {
      logger.error('Failed to revoke user sessions', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId
      });
      throw error;
    }
  }

  private async generateTokenPair(userId: string, email: string, role: UserRole): Promise<TokenPair> {
    const payload: Omit<JWTPayload, 'iat' | 'exp'> = {
      userId,
      email,
      role
    };

    const accessToken = jwt.sign(payload, this.jwtSecret, {
      expiresIn: this.jwtExpiresIn
    });

    const refreshToken = crypto.randomBytes(64).toString('hex');
    const expiresAt = new Date(Date.now() + this.refreshTokenExpiresIn * 1000);

    // Create session
    const session = new Session({
      userId,
      refreshToken,
      expiresAt
    });
    await session.save();

    return {
      accessToken,
      refreshToken,
      expiresIn: this.getTokenExpirationTime()
    };
  }

  private getTokenExpirationTime(): number {
    const expiresIn = this.jwtExpiresIn;
    const unit = expiresIn.slice(-1);
    const value = parseInt(expiresIn.slice(0, -1));

    switch (unit) {
      case 's': return value;
      case 'm': return value * 60;
      case 'h': return value * 3600;
      case 'd': return value * 86400;
      default: return 900; // 15 minutes default
    }
  }

  private validatePassword(password: string): void {
    if (password.length < 8) {
      throw new Error(AuthErrorCode.PASSWORD_TOO_WEAK);
    }

    // Check for at least one uppercase letter
    if (!/[A-Z]/.test(password)) {
      throw new Error(AuthErrorCode.PASSWORD_TOO_WEAK);
    }

    // Check for at least one lowercase letter
    if (!/[a-z]/.test(password)) {
      throw new Error(AuthErrorCode.PASSWORD_TOO_WEAK);
    }

    // Check for at least one number
    if (!/\d/.test(password)) {
      throw new Error(AuthErrorCode.PASSWORD_TOO_WEAK);
    }

    // Check for at least one special character
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      throw new Error(AuthErrorCode.PASSWORD_TOO_WEAK);
    }
  }
}

export default new AuthService();