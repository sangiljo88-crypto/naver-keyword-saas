import { Hono } from 'hono';
import { Bindings, RegisterRequest, LoginRequest, AuthResponse, User } from '../types';
import { hashPassword, comparePassword, generateToken, isValidEmail } from '../utils/auth';

const auth = new Hono<{ Bindings: Bindings }>();

/**
 * POST /api/auth/register
 * Register new user
 */
auth.post('/register', async (c) => {
  try {
    const body = await c.req.json<RegisterRequest>();
    const { email, password, name } = body;
    
    // Validation
    if (!email || !password) {
      return c.json({ error: '이메일과 비밀번호를 입력해주세요.' }, 400);
    }
    
    if (!isValidEmail(email)) {
      return c.json({ error: '유효한 이메일 주소를 입력해주세요.' }, 400);
    }
    
    if (password.length < 6) {
      return c.json({ error: '비밀번호는 최소 6자 이상이어야 합니다.' }, 400);
    }
    
    // Check if user already exists
    const existingUser = await c.env.DB.prepare(
      'SELECT id FROM users WHERE email = ?'
    ).bind(email).first();
    
    if (existingUser) {
      return c.json({ error: '이미 가입된 이메일입니다.' }, 400);
    }
    
    // Hash password
    const passwordHash = await hashPassword(password);
    
    // Insert user
    const result = await c.env.DB.prepare(
      'INSERT INTO users (email, password_hash, name) VALUES (?, ?, ?)'
    ).bind(email, passwordHash, name || null).run();
    
    if (!result.success) {
      return c.json({ error: '회원가입에 실패했습니다.' }, 500);
    }
    
    // Get created user
    const user = await c.env.DB.prepare(
      'SELECT id, email, name FROM users WHERE email = ?'
    ).bind(email).first<User>();
    
    if (!user) {
      return c.json({ error: '사용자 정보를 가져오는데 실패했습니다.' }, 500);
    }
    
    // Generate token
    const token = generateToken(user.id, user.email);
    
    const response: AuthResponse = {
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name
      }
    };
    
    return c.json(response, 201);
  } catch (error) {
    console.error('Register error:', error);
    return c.json({ error: '회원가입 처리 중 오류가 발생했습니다.' }, 500);
  }
});

/**
 * POST /api/auth/login
 * User login
 */
auth.post('/login', async (c) => {
  try {
    const body = await c.req.json<LoginRequest>();
    const { email, password } = body;
    
    // Validation
    if (!email || !password) {
      return c.json({ error: '이메일과 비밀번호를 입력해주세요.' }, 400);
    }
    
    // Get user
    const user = await c.env.DB.prepare(
      'SELECT id, email, name, password_hash FROM users WHERE email = ?'
    ).bind(email).first<User>();
    
    if (!user) {
      return c.json({ error: '이메일 또는 비밀번호가 일치하지 않습니다.' }, 401);
    }
    
    // Verify password
    const isValid = await comparePassword(password, user.password_hash);
    
    if (!isValid) {
      return c.json({ error: '이메일 또는 비밀번호가 일치하지 않습니다.' }, 401);
    }
    
    // Generate token
    const token = generateToken(user.id, user.email);
    
    const response: AuthResponse = {
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name
      }
    };
    
    return c.json(response);
  } catch (error) {
    console.error('Login error:', error);
    return c.json({ error: '로그인 처리 중 오류가 발생했습니다.' }, 500);
  }
});

export default auth;
