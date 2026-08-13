import { Router, Request, Response } from 'express';
import { OAuth2Client } from 'google-auth-library';
import { UserRole } from '@my-app/types';
import { signJWT, authenticateJWT, AuthUser } from '../middleware/auth';

const router = Router();

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || 'mock-google-client-id';
const googleClient = new OAuth2Client(GOOGLE_CLIENT_ID);

/**
 * POST /api/auth/google
 * Verifies a Google OAuth ID token and issues a backend JWT.
 * Body: { idToken: string }
 */
router.post('/google', async (req: Request, res: Response) => {
  try {
    const { idToken } = req.body;

    if (!idToken) {
      res.status(400).json({ error: 'Missing idToken in request body.' });
      return;
    }

    const ticket = await googleClient.verifyIdToken({
      idToken,
      audience: GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();

    if (!payload) {
      res.status(401).json({ error: 'Unable to verify Google token.' });
      return;
    }

    // Map Google profile to our AuthUser claims
    const user: AuthUser = {
      id: payload.sub,
      name: payload.name || 'Google User',
      email: payload.email || '',
      DomainAccount: `GOOGLE\\${(payload.email || '').split('@')[0].toUpperCase()}`,
      AccountGroup: 'BU1',
      AccountID: `G-${payload.sub.slice(0, 8)}`,
      AccountName: payload.name || 'Google User',
      role: 'admin' as UserRole,
    };

    const token = signJWT(user);

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        AccountName: user.AccountName,
        AccountGroup: user.AccountGroup,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[Auth: Google] Verification error:', message);
    res.status(401).json({ error: 'Google authentication failed.', details: message });
  }
});

/**
 * POST /api/auth/demo-login
 * Issues a JWT for demo/development purposes using role-based test accounts.
 * Body: { role?: UserRole, accountName?: string }
 */
router.post('/demo-login', (req: Request, res: Response) => {
  const role = (req.body.role || 'admin') as UserRole;
  const accountName = req.body.accountName || 'Sarah Jenkins';

  const user: AuthUser = {
    id: 'usr_demo_101',
    name: accountName,
    email: `${accountName.toLowerCase().replace(/\s+/g, '.')}@company.com`,
    DomainAccount: `CORP\\${accountName.toUpperCase().replace(/\s+/g, '')}`,
    AccountGroup: role === 'bu_admin' ? 'BU2' : 'BU1',
    AccountID: 'ACC-8890',
    AccountName: accountName,
    role,
  };

  const token = signJWT(user);

  res.json({
    success: true,
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      AccountName: user.AccountName,
      AccountGroup: user.AccountGroup,
    },
  });
});

/**
 * GET /api/auth/me
 * Returns the authenticated user's session context (requires valid JWT).
 */
router.get('/me', authenticateJWT, (req: Request, res: Response) => {
  res.json({
    success: true,
    user: req.user,
  });
});

export default router;
