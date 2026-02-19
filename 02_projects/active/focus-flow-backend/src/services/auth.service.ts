/**
 * Authentication Service - Registration, login, session management
 *
 * Uses bcrypt for password hashing and crypto.randomUUID() for session tokens.
 * Sessions expire after 30 days.
 */

import crypto from 'crypto';
import bcrypt from 'bcrypt';
import { db } from '../db/connection';
import { eq, and, gt } from 'drizzle-orm';
import * as schema from '../db/schema';
import { audit } from './db.service';

const BCRYPT_ROUNDS = 12;
const SESSION_DURATION_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: string;
}

interface AuthResult {
  user: AuthUser;
  team: { id: string; name: string };
  token: string;
}

interface SessionInfo {
  user: AuthUser;
  teamId: string;
}

/**
 * Register a new user, create a default team, add user as owner, return auth result.
 */
async function register(input: { email: string; password: string; name: string }): Promise<AuthResult> {
  const { email, password, name } = input;

  // Check if email already in use
  const existing = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.email, email.toLowerCase().trim()))
    .limit(1);

  if (existing.length > 0) {
    throw new Error('A user with this email already exists');
  }

  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

  // Create user
  const [user] = await db
    .insert(schema.users)
    .values({
      email: email.toLowerCase().trim(),
      name,
      passwordHash,
    })
    .returning();

  // Create default team
  const [team] = await db
    .insert(schema.teams)
    .values({
      name: `${name}'s Team`,
      ownerId: user.id,
    })
    .returning();

  // Add user as owner of the team
  await db.insert(schema.teamMembers).values({
    teamId: team.id,
    userId: user.id,
    role: 'owner',
  });

  // Create session
  const token = await createSession(user.id);

  await audit(team.id, user.id, null, 'user.register', 'user', user.id, { email: user.email });

  return {
    user: { id: user.id, email: user.email, name: user.name, role: user.role },
    team: { id: team.id, name: team.name },
    token,
  };
}

/**
 * Login with email and password. Returns auth result or throws on invalid credentials.
 */
async function login(input: { email: string; password: string }): Promise<AuthResult> {
  const { email, password } = input;

  const [user] = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.email, email.toLowerCase().trim()))
    .limit(1);

  if (!user) {
    throw new Error('Invalid email or password');
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    throw new Error('Invalid email or password');
  }

  // Find user's team
  const team = await getTeamForUser(user.id);
  if (!team) {
    throw new Error('User has no associated team');
  }

  // Create session
  const token = await createSession(user.id);

  await audit(team.id, user.id, null, 'user.login', 'session', null, { email: user.email });

  return {
    user: { id: user.id, email: user.email, name: user.name, role: user.role },
    team: { id: team.id, name: team.name },
    token,
  };
}

/**
 * Logout by deleting the session associated with the given token.
 */
async function logout(token: string): Promise<void> {
  await db.delete(schema.sessions).where(eq(schema.sessions.token, token));
}

/**
 * Validate a session token. Returns user and teamId if valid, null otherwise.
 */
async function validateSession(token: string): Promise<SessionInfo | null> {
  const [session] = await db
    .select()
    .from(schema.sessions)
    .where(
      and(
        eq(schema.sessions.token, token),
        gt(schema.sessions.expiresAt, new Date())
      )
    )
    .limit(1);

  if (!session) {
    return null;
  }

  const [user] = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.id, session.userId))
    .limit(1);

  if (!user) {
    return null;
  }

  const team = await getTeamForUser(user.id);
  if (!team) {
    return null;
  }

  return {
    user: { id: user.id, email: user.email, name: user.name, role: user.role },
    teamId: team.id,
  };
}

/**
 * Get user info and team info for the /auth/me endpoint.
 */
async function getUserInfo(userId: string, teamId?: string): Promise<{ user: AuthUser; team: { id: string; name: string } } | null> {
  const [user] = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.id, userId))
    .limit(1);

  if (!user) {
    return null;
  }

  let team: { id: string; name: string } | null = null;

  if (teamId) {
    const [t] = await db
      .select({ id: schema.teams.id, name: schema.teams.name })
      .from(schema.teams)
      .where(eq(schema.teams.id, teamId))
      .limit(1);
    team = t ?? null;
  }

  if (!team) {
    team = await getTeamForUser(user.id);
  }

  if (!team) {
    return null;
  }

  return {
    user: { id: user.id, email: user.email, name: user.name, role: user.role },
    team,
  };
}

/**
 * Returns the first team the user belongs to.
 */
async function getTeamForUser(userId: string): Promise<{ id: string; name: string } | null> {
  const [membership] = await db
    .select({
      id: schema.teams.id,
      name: schema.teams.name,
    })
    .from(schema.teamMembers)
    .innerJoin(schema.teams, eq(schema.teamMembers.teamId, schema.teams.id))
    .where(eq(schema.teamMembers.userId, userId))
    .limit(1);

  return membership ?? null;
}

/**
 * Creates a session row and returns the token.
 */
async function createSession(userId: string): Promise<string> {
  const token = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);

  await db.insert(schema.sessions).values({
    userId,
    token,
    expiresAt,
  });

  return token;
}

export const authService = {
  register,
  login,
  logout,
  validateSession,
  getUserInfo,
  getTeamForUser,
};
