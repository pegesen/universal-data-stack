import mongoose, { Schema } from 'mongoose';
import { Session } from '../types/auth';

const sessionSchema = new Schema<Session>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  refreshToken: {
    type: String,
    required: true,
    unique: true
  },
  userAgent: {
    type: String,
    maxlength: 500
  },
  ipAddress: {
    type: String,
    maxlength: 45 // IPv6 max length
  },
  isActive: {
    type: Boolean,
    default: true
  },
  expiresAt: {
    type: Date,
    required: true,
    index: { expireAfterSeconds: 0 } // TTL index
  }
}, {
  timestamps: true
});

// Indexes
sessionSchema.index({ userId: 1 });
sessionSchema.index({ refreshToken: 1 });
sessionSchema.index({ isActive: 1 });
sessionSchema.index({ expiresAt: 1 });

// Static method to find active session
sessionSchema.statics.findActiveSession = function(refreshToken: string) {
  return this.findOne({ 
    refreshToken, 
    isActive: true,
    expiresAt: { $gt: new Date() }
  });
};

// Static method to revoke user sessions
sessionSchema.statics.revokeUserSessions = function(userId: string) {
  return this.updateMany(
    { userId, isActive: true },
    { isActive: false }
  );
};

// Static method to clean expired sessions
sessionSchema.statics.cleanExpiredSessions = function() {
  return this.deleteMany({
    expiresAt: { $lt: new Date() }
  });
};

// Instance method to revoke session
sessionSchema.methods.revoke = function() {
  this.isActive = false;
  return this.save();
};

export default mongoose.model<Session>('Session', sessionSchema);