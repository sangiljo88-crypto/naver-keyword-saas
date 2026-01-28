import { Hono } from 'hono';
import { Bindings, User, ApiCredentials, ApiCredentialsRequest } from '../types';
import { authMiddleware } from '../middleware/auth';
import { hashPassword } from '../utils/auth';

const user = new Hono<{ Bindings: Bindings }>();

// Apply auth middleware to all routes
user.use('/*', authMiddleware);

/**
 * GET /api/user/me
 * Get current user info
 */
user.get('/me', async (c) => {
  const currentUser = c.get('user') as User;
  
  return c.json({
    id: currentUser.id,
    email: currentUser.email,
    name: currentUser.name,
    createdAt: currentUser.created_at
  });
});

/**
 * PUT /api/user/password
 * Change password
 */
user.put('/password', async (c) => {
  try {
    const currentUser = c.get('user') as User;
    const { currentPassword, newPassword } = await c.req.json();
    
    if (!currentPassword || !newPassword) {
      return c.json({ error: '현재 비밀번호와 새 비밀번호를 입력해주세요.' }, 400);
    }
    
    if (newPassword.length < 6) {
      return c.json({ error: '새 비밀번호는 최소 6자 이상이어야 합니다.' }, 400);
    }
    
    // Get current user with password
    const user = await c.env.DB.prepare(
      'SELECT password_hash FROM users WHERE id = ?'
    ).bind(currentUser.id).first<{ password_hash: string }>();
    
    if (!user) {
      return c.json({ error: '사용자를 찾을 수 없습니다.' }, 404);
    }
    
    // Verify current password
    const bcrypt = await import('bcryptjs');
    const isValid = await bcrypt.compare(currentPassword, user.password_hash);
    
    if (!isValid) {
      return c.json({ error: '현재 비밀번호가 일치하지 않습니다.' }, 401);
    }
    
    // Hash new password
    const newPasswordHash = await hashPassword(newPassword);
    
    // Update password
    const result = await c.env.DB.prepare(
      'UPDATE users SET password_hash = ?, updated_at = datetime("now") WHERE id = ?'
    ).bind(newPasswordHash, currentUser.id).run();
    
    if (!result.success) {
      return c.json({ error: '비밀번호 변경에 실패했습니다.' }, 500);
    }
    
    return c.json({ message: '비밀번호가 성공적으로 변경되었습니다.' });
  } catch (error) {
    console.error('Change password error:', error);
    return c.json({ error: '비밀번호 변경 중 오류가 발생했습니다.' }, 500);
  }
});

/**
 * DELETE /api/user/account
 * Delete user account
 */
user.delete('/account', async (c) => {
  try {
    const currentUser = c.get('user') as User;
    const { password } = await c.req.json();
    
    if (!password) {
      return c.json({ error: '비밀번호를 입력해주세요.' }, 400);
    }
    
    // Get user with password
    const user = await c.env.DB.prepare(
      'SELECT password_hash FROM users WHERE id = ?'
    ).bind(currentUser.id).first<{ password_hash: string }>();
    
    if (!user) {
      return c.json({ error: '사용자를 찾을 수 없습니다.' }, 404);
    }
    
    // Verify password
    const bcrypt = await import('bcryptjs');
    const isValid = await bcrypt.compare(password, user.password_hash);
    
    if (!isValid) {
      return c.json({ error: '비밀번호가 일치하지 않습니다.' }, 401);
    }
    
    // Delete user (CASCADE will delete related records)
    const result = await c.env.DB.prepare(
      'DELETE FROM users WHERE id = ?'
    ).bind(currentUser.id).run();
    
    if (!result.success) {
      return c.json({ error: '계정 삭제에 실패했습니다.' }, 500);
    }
    
    return c.json({ message: '계정이 성공적으로 삭제되었습니다.' });
  } catch (error) {
    console.error('Delete account error:', error);
    return c.json({ error: '계정 삭제 중 오류가 발생했습니다.' }, 500);
  }
});

/**
 * GET /api/user/api-credentials
 * Get user's API credentials
 */
user.get('/api-credentials', async (c) => {
  try {
    const currentUser = c.get('user') as User;
    
    const credentials = await c.env.DB.prepare(
      'SELECT * FROM api_credentials WHERE user_id = ?'
    ).bind(currentUser.id).first<ApiCredentials>();
    
    if (!credentials) {
      return c.json({
        naverAdAccKey: null,
        naverAdSecretKey: null,
        naverAdCustomerId: null,
        naverDevClientId: null,
        naverDevClientSecret: null
      });
    }
    
    // Return credentials (mask sensitive parts)
    return c.json({
      naverAdAccKey: credentials.naver_ad_acc_key ? maskString(credentials.naver_ad_acc_key) : null,
      naverAdSecretKey: credentials.naver_ad_secret_key ? maskString(credentials.naver_ad_secret_key) : null,
      naverAdCustomerId: credentials.naver_ad_customer_id,
      naverDevClientId: credentials.naver_dev_client_id ? maskString(credentials.naver_dev_client_id) : null,
      naverDevClientSecret: credentials.naver_dev_client_secret ? maskString(credentials.naver_dev_client_secret) : null,
      hasNaverAd: !!(credentials.naver_ad_acc_key && credentials.naver_ad_secret_key && credentials.naver_ad_customer_id),
      hasNaverDev: !!(credentials.naver_dev_client_id && credentials.naver_dev_client_secret)
    });
  } catch (error) {
    console.error('Get API credentials error:', error);
    return c.json({ error: 'API 인증 정보 조회 중 오류가 발생했습니다.' }, 500);
  }
});

/**
 * PUT /api/user/api-credentials
 * Update user's API credentials
 */
user.put('/api-credentials', async (c) => {
  try {
    const currentUser = c.get('user') as User;
    const body = await c.req.json<ApiCredentialsRequest>();
    
    // Check if credentials exist
    const existing = await c.env.DB.prepare(
      'SELECT id FROM api_credentials WHERE user_id = ?'
    ).bind(currentUser.id).first();
    
    if (existing) {
      // Update existing credentials
      const updates: string[] = [];
      const values: any[] = [];
      
      if (body.naverAdAccKey !== undefined) {
        updates.push('naver_ad_acc_key = ?');
        values.push(body.naverAdAccKey);
      }
      if (body.naverAdSecretKey !== undefined) {
        updates.push('naver_ad_secret_key = ?');
        values.push(body.naverAdSecretKey);
      }
      if (body.naverAdCustomerId !== undefined) {
        updates.push('naver_ad_customer_id = ?');
        values.push(body.naverAdCustomerId);
      }
      if (body.naverDevClientId !== undefined) {
        updates.push('naver_dev_client_id = ?');
        values.push(body.naverDevClientId);
      }
      if (body.naverDevClientSecret !== undefined) {
        updates.push('naver_dev_client_secret = ?');
        values.push(body.naverDevClientSecret);
      }
      
      if (updates.length === 0) {
        return c.json({ error: '업데이트할 정보가 없습니다.' }, 400);
      }
      
      updates.push('updated_at = datetime("now")');
      values.push(currentUser.id);
      
      const query = `UPDATE api_credentials SET ${updates.join(', ')} WHERE user_id = ?`;
      const result = await c.env.DB.prepare(query).bind(...values).run();
      
      if (!result.success) {
        return c.json({ error: 'API 인증 정보 업데이트에 실패했습니다.' }, 500);
      }
    } else {
      // Insert new credentials
      const result = await c.env.DB.prepare(
        `INSERT INTO api_credentials 
        (user_id, naver_ad_acc_key, naver_ad_secret_key, naver_ad_customer_id, naver_dev_client_id, naver_dev_client_secret) 
        VALUES (?, ?, ?, ?, ?, ?)`
      ).bind(
        currentUser.id,
        body.naverAdAccKey || null,
        body.naverAdSecretKey || null,
        body.naverAdCustomerId || null,
        body.naverDevClientId || null,
        body.naverDevClientSecret || null
      ).run();
      
      if (!result.success) {
        return c.json({ error: 'API 인증 정보 저장에 실패했습니다.' }, 500);
      }
    }
    
    return c.json({ message: 'API 인증 정보가 성공적으로 저장되었습니다.' });
  } catch (error) {
    console.error('Update API credentials error:', error);
    return c.json({ error: 'API 인증 정보 저장 중 오류가 발생했습니다.' }, 500);
  }
});

/**
 * Helper function to mask sensitive strings
 */
function maskString(str: string): string {
  if (str.length <= 8) {
    return '*'.repeat(str.length);
  }
  return str.substring(0, 4) + '*'.repeat(str.length - 8) + str.substring(str.length - 4);
}

export default user;
