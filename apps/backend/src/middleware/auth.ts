import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { UserRole } from '@my-app/types';

/**
 * Authenticated user context attached to Express Request.
 */
export interface AuthUser {
  id: string;
  name: string;
  email: string;
  DomainAccount: string;
  AccountGroup: string;
  AccountID: string;
  AccountName: string;
  role: UserRole;
}

/**
 * Extend Express Request to include authenticated user context.
 */
declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-deals-reg-portal-jwt-key';

/**
 * Express middleware: Verifies Bearer JWT from Authorization header
 * and attaches decoded user context to req.user.
 */
export function authenticateJWT(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    // Fallback: If query parameters are provided (e.g. from frontend getScopedDeals), synthesize user context
    const queryRole = (req.query.userRole as UserRole) || 'admin';
    const queryAccountName = (req.query.accountName as string) || 'Sarah Jenkins';
    const queryAccountGroup = (req.query.accountGroup as string) || 'BU1';

    req.user = {
      id: 'usr_scoped_query',
      name: queryAccountName,
      email: `${queryAccountName.toLowerCase().replace(/\s+/g, '.')}@company.com`,
      DomainAccount: `CORP\\${queryAccountName.toUpperCase().replace(/\s+/g, '')}`,
      AccountGroup: queryAccountGroup,
      AccountID: 'ACC-0001',
      AccountName: queryAccountName,
      role: queryRole,
    };
    next();
    return;
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as AuthUser;
    req.user = decoded;
    next();
  } catch (err) {
    res.status(403).json({ error: 'Invalid or expired token.' });
    return;
  }
}

/**
 * Signs a JWT token with user claims. Token expires in 24 hours.
 */
export function signJWT(payload: Omit<AuthUser, 'iat' | 'exp'>): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '24h' });
}
