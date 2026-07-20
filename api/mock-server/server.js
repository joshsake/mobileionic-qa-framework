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
const fs = require('fs');
const path = require('path');

const server = jsonServer.create();

/**
 * Load db.json into memory rather than pointing json-server at the file.
 *
 * json-server writes every mutation straight back to disk. That means a POST or
 * PUT from one test run leaks into the next, and the seeded fixtures drift over
 * time. Passing a plain object makes the router operate on an in-memory copy, so
 * every server start begins from the same known-good state and the committed
 * db.json is never modified.
 */
const seedData = JSON.parse(fs.readFileSync(path.join(__dirname, 'db.json'), 'utf8'));
const router = jsonServer.router(JSON.parse(JSON.stringify(seedData)));
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

/**
 * Allow any localhost origin. CI serves the built app on whichever port is free,
 * so pinning an explicit list here caused cross-origin failures in the pipeline.
 */
server.use(cors({
  origin: /^http:\/\/localhost:\d+$/,
  credentials: true,
}));

server.use(jsonServer.bodyParser);
server.use(middlewares);

// ─── Health check ────────────────────────────────────────────────────────────

/**
 * GET /api/health
 * Unauthenticated readiness probe. CI polls this before starting a test run so
 * the suite never races against a server that is still booting.
 */
server.get('/api/health', (req, res) => {
  return res.status(200).json({ status: 'ok', uptime: process.uptime() });
});

/**
 * POST /api/test/reset
 * Restores the in-memory database to its seeded state. Test suites that mutate
 * shared records call this in a beforeAll hook to guarantee a clean baseline.
 */
server.post('/api/test/reset', (req, res) => {
  router.db.setState(JSON.parse(JSON.stringify(seedData))).write();
  return res.status(200).json({ status: 'reset' });
});

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

// ─── Workout listing ────────────────────────────────────────────────────────

/**
 * GET /api/workouts
 *
 * Mirrors WorkoutsController.GetAll: optional userId/from/to filters, newest
 * first. json-server's rewriter strips the query string before the router sees
 * it, so any filtered request used to 404 and the "filtering" contract test
 * quietly asserted nothing.
 *
 * Note this deliberately does NOT scope results to the bearer token, because
 * the .NET controller does not either — see the skipped authorization spec in
 * tests/api/specs/workouts.spec.ts. Diverging here would hide a real defect
 * behind a mock that is stricter than the service it stands in for.
 */
server.get('/api/workouts', (req, res) => {
  const { userId, from, to } = req.query;
  let workouts = router.db.get('workouts').value();

  if (userId !== undefined) {
    workouts = workouts.filter((w) => w.userId === Number(userId));
  }
  if (from !== undefined) {
    workouts = workouts.filter((w) => new Date(w.date) >= new Date(from));
  }
  if (to !== undefined) {
    workouts = workouts.filter((w) => new Date(w.date) <= new Date(to));
  }

  const ordered = [...workouts].sort((a, b) => new Date(b.date) - new Date(a.date));
  return res.status(200).json(ordered);
});

// ─── Workout creation ───────────────────────────────────────────────────────

/**
 * POST /api/workouts
 *
 * json-server persists whatever the client posts and only adds an id, so a
 * created record was missing the server-assigned fields the schema requires.
 * The .NET controller stamps Id and CreatedAt itself (Workout.Id = 0;
 * Workout.CreatedAt = DateTime.UtcNow), so the mock does the same and falls back
 * to the authenticated user for userId.
 */
server.post('/api/workouts', (req, res) => {
  const { exerciseType, durationMinutes } = req.body;

  if (!exerciseType || durationMinutes === undefined) {
    return res.status(400).json({ message: 'exerciseType and durationMinutes are required.' });
  }

  const db = router.db;
  const workouts = db.get('workouts');
  const existingIds = workouts.value().map((w) => w.id);
  const nextId = existingIds.length > 0 ? Math.max(...existingIds) + 1 : 1;

  const created = {
    id: nextId,
    userId: req.body.userId ?? req.userId,
    exerciseType,
    durationMinutes,
    notes: req.body.notes ?? null,
    date: req.body.date ?? new Date().toISOString(),
    createdAt: new Date().toISOString(),
  };

  workouts.push(created).write();
  return res.status(201).json(created);
});

// ─── Workout update ─────────────────────────────────────────────────────────

/**
 * PUT /api/workouts/:id
 *
 * json-server treats PUT as a full document replacement, so a partial payload
 * silently drops every field the caller omitted. The .NET controller merges the
 * incoming fields onto the existing record instead. This handler reproduces the
 * .NET behaviour so tests written against the mock stay valid against the real
 * API.
 */
server.put('/api/workouts/:id', (req, res) => {
  const db = router.db;
  const id = Number(req.params.id);
  const existing = db.get('workouts').find({ id }).value();

  if (!existing) {
    return res.status(404).json({ message: 'Workout not found.' });
  }

  const mutableFields = ['exerciseType', 'durationMinutes', 'notes', 'date'];
  const updates = {};
  mutableFields.forEach((field) => {
    if (req.body[field] !== undefined) updates[field] = req.body[field];
  });

  const updated = db.get('workouts').find({ id }).assign(updates).write();
  return res.status(200).json(updated);
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
