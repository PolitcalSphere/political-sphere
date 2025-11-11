import express from 'express';

import { authService } from '../auth/auth.service.ts';
import logger from '../logger.js';

const router = express.Router();

// POST /register - Register new user
router.post('/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;

    // Validate input
    if (!username || !email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Username, email, and password are required',
      });
    }

    // Use centralized authService for registration
    const { user, tokens } = await authService.register({
      username,
      email,
      password,
    });

    logger.info('User registered successfully', { userId: user.id, username });

    res.status(201).json({
      success: true,
      data: {
        id: user.id,
        username: user.username,
        email: user.email,
        token: tokens.accessToken,
        refreshToken: tokens.refreshToken,
      },
    });
  } catch (error) {
    logger.error('Registration error:', error);

    // Handle duplicate user
    if (error.message?.includes('already exists')) {
      return res.status(409).json({
        success: false,
        error: 'User already exists',
      });
    }

    res.status(500).json({
      success: false,
      error: error.message || 'Registration failed',
    });
  }
});

// POST /login - Login user
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email and password required',
      });
    }

    // Use centralized authService for login
    const { user, tokens } = await authService.login({
      username: email, // authService uses username, but we accept email
      password,
    });

    logger.info('User logged in', { userId: user.id, username: user.username });

    res.json({
      success: true,
      data: {
        token: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
        },
      },
    });
  } catch (error) {
    logger.error('Login error:', error);
    res.status(401).json({
      success: false,
      error: error.message || 'Login failed',
    });
  }
});

// POST /logout - Logout user
router.post('/logout', (_req, res) => {
  res.json({
    success: true,
    message: 'Logged out successfully',
  });
});

export default router;
