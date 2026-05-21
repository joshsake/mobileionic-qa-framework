/**
 * Custom JSON Server instance for the Fitness Tracker mock API.
 *
 * This server wraps json-server with:
 *  - CORS configured for the Ionic dev server (port 8100)
 *  - Custom /api/auth/login and /api/auth/register endpoints that return JWTs
 *  - Custom /api/analytics/summary endpoint that computes stats from workout data
 *  - Bearer-token middleware that protects /api/workouts and /api/profile
 *
 * Passwords for seeded users (all use "password123"):
 *   test@example.com  | admin@example.com  | user2@example.com
 */

const jsonServer = require('json-server');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const path = require('path');

const server = jsonServer.create();
const router = jsonServer.router(path.join(__dirname, 'db.json'));
const middlewares = jsonServer.defaults();

// ─── Configuration ───────────────────────────────────────────────────────────

const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'mock-server-secret-key-for-testing';
const JWT_EXPIRY = '24h';

/**
 * Plaintext passwords for seeded users.
 * In a real server these would be hashed; here we keep them simple so QA
 * tests can authenticate without needing bcrypt at runtime.
 */
const USER_PASSWORDS = {
  'test@example.com': 'password123',
  'admin@example.com': 'password123',
  'user2@example.com': 'password123',
};

// ─── Middleware ───────────────────────────────────────────────────────────────

server.use(cors({
  origin: ['http://localhost:8100', 'http://localhost:4200', 'http://localhost:3000'],
  credentials: true,
}));

server.use(jsonServer.bodyParser);
server.use(middlewares);

// ─── Helper: generate a JWT for a given user record ──────────────────────────

function generateToken(user) {
  const payload = {
    sub: user.id,
    email: user.email,
    displayName: user.displayName,
  };
  const token = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRY });
  const decoded = jwt.decode(token);
  return {
    token,
    expiresAt: new Date(decoded.exp * 1000).toISOString(),
    userId: user.id,
    displayName: user.displayName,
    email: user.email,
  };
}

// ─── Helper: verify Bearer token and return decoded payload ──────────────────

function verifyToken(req) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  try {
    return jwt.verify(authHeader.split(' ')[1], JWT_SECRET);
  } catch {
    return null;
  }
}

// ─── Custom Routes ───────────────────────────────────────────────────────────

/**
 * POST /api/auth/login
 * Accepts { email, password } and returns a JWT + user info on success.
 * Returns 401 with { message } on failure.
 */
server.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required.' });
  }

  const db = router.db;
  const user = db.get('users').find({ email }).value();

  if (!user) {
    return res.status(401).json({ message: 'Invalid email or password.' });
  }

  // Check against our known passwords map
  if (USER_PASSWORDS[email] !== password) {
    return res.status(401).json({ message: 'Invalid email or password.' });
  }

  const response = generateToken(user);
  return res.status(200).json(response);
});

/**
 * POST /api/auth/register
 * Accepts { email, password, displayName } and creates a new user.
 * Returns 201 with JWT + user info on success, 409 if email is taken.
 */
server.post('/api/auth/register', (req, res) => {
  const { email, password, displayName } = req.body;

  if (!email || !password || !displayName) {
    return res.status(400).json({ message: 'Email, password, and displayName are required.' });
  }

  if (password.length < 6) {
    return res.status(400).json({ message: 'Password must be at least 6 characters.' });
  }

  const db = router.db;
  const existing = db.get('users').find({ email }).value();

  if (existing) {
    return res.status(409).json({ message: 'A user with this email already exists.' });
  }

  // Create new user
  const users = db.get('users');
  const newUser = {
    id: Date.now(),
    email,
    passwordHash: `$2a$10$mock_hash_${Date.now()}`,
    displayName,
    createdAt: new Date().toISOString(),
  };
  users.push(newUser).write();

  // Store password for future logins during this server session
  USER_PASSWORDS[email] = password;

  const response = generateToken(newUser);
  return res.status(201).json(response);
});

/**
 * GET /api/analytics/summary
 * Returns analytics for the authenticated user.
 * Requires a valid Bearer token.
 */
server.get('/api/analytics/summary', (req, res) => {
  const decoded = verifyToken(req);
  if (!decoded) {
    return res.status(401).json({ message: 'Unauthorized. Please provide a valid Bearer token.' });
  }

  const db = router.db;
  const userId = decoded.sub;

  // Try pre-computed analytics first
  const analytics = db.get('analytics').find({ userId }).value();
  if (analytics) {
    return res.status(200).json(analytics);
  }

  // Compute from workout data if no pre-computed entry exists
  const workouts = db.get('workouts').filter({ userId }).value();
  const totalWorkouts = workouts.length;
  const totalMinutes = workouts.reduce((sum, w) => sum + w.durationMinutes, 0);
  const averageDuration = totalWorkouts > 0 ? Math.round(totalMinutes / totalWorkouts) : 0;

  const workoutsByType = {};
  workouts.forEach((w) => {
    workoutsByType[w.exerciseType] = (workoutsByType[w.exerciseType] || 0) + 1;
  });

  return res.status(200).json({
    userId,
    totalWorkouts,
    totalMinutes,
    averageDuration,
    workoutsByType,
    weeklyBreakdown: [],
    streak: 0,
    lastWorkoutDate: workouts.length > 0 ? workouts[workouts.length - 1].date : null,
  });
});

// ─── Auth Guard Middleware ───────────────────────────────────────────────────
// Protect workout and profile routes — anything under /api/ except /api/auth/*

server.use('/api/workouts', (req, res, next) => {
  if (req.method === 'OPTIONS') return next();
  const decoded = verifyToken(req);
  if (!decoded) {
    return res.status(401).json({ message: 'Unauthorized. Please provide a valid Bearer token.' });
  }
  // Attach userId for downstream filtering
  req.userId = decoded.sub;
  next();
});

server.use('/api/profile', (req, res, next) => {
  if (req.method === 'OPTIONS') return next();
  const decoded = verifyToken(req);
  if (!decoded) {
    return res.status(401).json({ message: 'Unauthorized. Please provide a valid Bearer token.' });
  }
  req.userId = decoded.sub;
  next();
});

// ─── Profile endpoints ──────────────────────────────────────────────────────

/**
 * GET /api/profile
 * Returns the authenticated user's profile (without passwordHash).
 */
server.get('/api/profile', (req, res) => {
  const db = router.db;
  const user = db.get('users').find({ id: req.userId }).value();
  if (!user) {
    return res.status(404).json({ message: 'User not found.' });
  }
  const { passwordHash, ...profile } = user;
  return res.status(200).json(profile);
});

/**
 * PUT /api/profile
 * Updates the authenticated user's profile fields.
 */
server.put('/api/profile', (req, res) => {
  const db = router.db;
  const allowedFields = ['displayName'];
  const updates = {};
  allowedFields.forEach((field) => {
    if (req.body[field] !== undefined) updates[field] = req.body[field];
  });

  const user = db.get('users').find({ id: req.userId }).assign(updates).write();
  const { passwordHash, ...profile } = user;
  return res.status(200).json(profile);
});

// ─── Workout CRUD (via json-server router) ──────────────────────────────────
// Forward remaining /api/* requests to json-server's built-in router using
// the route rewriting from routes.json.

const routesJson = require('./routes.json');
server.use(jsonServer.rewriter(routesJson));
server.use(router);

// ─── Start ──────────────────────────────────────────────────────────────────

server.listen(PORT, () => {
  console.log(`Mock API server running on http://localhost:${PORT}`);
  console.log(`  POST /api/auth/login        — authenticate`);
  console.log(`  POST /api/auth/register      — create account`);
  console.log(`  GET  /api/workouts           — list workouts (auth required)`);
  console.log(`  POST /api/workouts           — create workout (auth required)`);
  console.log(`  GET  /api/analytics/summary  — analytics (auth required)`);
  console.log(`  GET  /api/profile            — user profile (auth required)`);
  console.log(`  PUT  /api/profile            — update profile (auth required)`);
});
