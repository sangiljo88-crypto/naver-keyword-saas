import * as bcrypt from 'bcryptjs';

/**
 * Hash a password using bcrypt
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

/**
 * Compare password with hash
 */
export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Generate JWT token (simplified - using simple encoding)
 * Note: In production, use proper JWT signing
 */
export function generateToken(userId: number, email: string): string {
  const payload = {
    userId,
    email,
    exp: Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60) // 7 days
  };
  
  // Simple encoding (use proper JWT in production)
  return btoa(JSON.stringify(payload));
}

/**
 * Verify and decode JWT token
 */
export function verifyToken(token: string): { userId: number; email: string } | null {
  try {
    const payload = JSON.parse(atob(token));
    
    // Check expiration
    if (payload.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }
    
    return {
      userId: payload.userId,
      email: payload.email
    };
  } catch {
    return null;
  }
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Calculate subscription end date
 */
export function calculateEndDate(planType: 'monthly' | 'semi-annual' | 'annual'): Date {
  const now = new Date();
  const days = {
    monthly: 30,
    'semi-annual': 180,
    annual: 365
  };
  
  now.setDate(now.getDate() + days[planType]);
  return now;
}

/**
 * Format date to ISO string for SQLite
 */
export function formatDateForDB(date: Date): string {
  return date.toISOString();
}

/**
 * Check if subscription is active
 */
export function isSubscriptionActive(endDate: string): boolean {
  return new Date(endDate) > new Date();
}
