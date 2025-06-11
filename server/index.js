import express from 'express';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { v4 as uuidv4 } from 'uuid';
import { dbPromise } from './db.js';
import { hashPassword, verifyPassword, signToken, verifyToken } from './auth.js';

const app = express();
const httpServer = createServer(app);
const io = new SocketIOServer(httpServer, { cors: { origin: '*' } });

app.use(express.json());

function authMiddleware(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth) return res.status(401).end();
  const [, token] = auth.split(' ');
  const payload = verifyToken(token);
  if (!payload) return res.status(401).end();
  req.user = payload;
  next();
}

io.on('connection', socket => {
  socket.on('joinRoom', sessionId => {
    socket.join(sessionId);
  });
  socket.on('editorUpdate', ({ sessionId, payload }) => {
    socket.to(sessionId).emit('editorUpdate', payload);
  });
  socket.on('cursorPositionUpdate', ({ sessionId, userId, position }) => {
    socket.to(sessionId).emit('cursorPositionUpdate', { userId, position });
  });
});

app.post('/auth/signup', async (req, res) => {
  const { email, password, role = 'editor' } = req.body;
  const id = uuidv4();
  const pwd = await hashPassword(password);
  const db = await dbPromise;
  try {
    await db.run('INSERT INTO users(id,email,password_hash,role) VALUES(?,?,?,?)', [id, email, pwd, role]);
  } catch (e) {
    return res.status(400).json({ error: 'Email already registered' });
  }
  const token = signToken({ sub: id });
  res.json({ token });
});

app.post('/auth/login', async (req, res) => {
  const { email, password } = req.body;
  const db = await dbPromise;
  const user = await db.get('SELECT * FROM users WHERE email=?', email);
  if (!user) return res.status(401).json({ error: 'Invalid credentials' });
  const valid = await verifyPassword(password, user.password_hash);
  if (!valid) return res.status(401).json({ error: 'Invalid credentials' });
  const token = signToken({ sub: user.id });
  res.json({ token });
});

app.get('/users/me', authMiddleware, async (req, res) => {
  const db = await dbPromise;
  const user = await db.get('SELECT id,email,role FROM users WHERE id=?', req.user.sub);
  res.json(user);
});

app.get('/sessions', authMiddleware, async (req, res) => {
  const db = await dbPromise;
  const rows = await db.all(
    `SELECT * FROM sessions WHERE owner_id=?
     OR id IN (SELECT session_id FROM participants WHERE user_id=?)`,
    req.user.sub,
    req.user.sub
  );
  res.json(rows);
});

app.post('/sessions', authMiddleware, async (req, res) => {
  const { name } = req.body;
  const id = uuidv4();
  const db = await dbPromise;
  await db.run('INSERT INTO sessions(id,name,owner_id) VALUES(?,?,?)', [id, name, req.user.sub]);
  await db.run('INSERT INTO participants(session_id,user_id) VALUES(?,?)', [id, req.user.sub]);
  res.json({ id });
});

app.post('/sessions/:id/join', authMiddleware, async (req, res) => {
  const { id } = req.params;
  const db = await dbPromise;
  await db.run('INSERT OR IGNORE INTO participants(session_id,user_id) VALUES(?,?)', [id, req.user.sub]);
  res.json({ status: 'joined' });
});

app.post('/ai/suggest', authMiddleware, (req, res) => {
  res.json({ suggestion: '// AI suggestion placeholder' });
});

app.post('/recordings/:sessionId/:ts', authMiddleware, async (req, res) => {
  const { sessionId, ts } = req.params;
  const { data } = req.body;
  const key = `${sessionId}/${ts}.json`;
  const db = await dbPromise;
  await db.run('INSERT INTO recordings(session_id,s3_key,recorded_at) VALUES(?,?,CURRENT_TIMESTAMP)', [sessionId, key]);
  res.json({ status: 'stored' });
});

app.get('/recordings/:sessionId', authMiddleware, async (req, res) => {
  const { sessionId } = req.params;
  const db = await dbPromise;
  const rows = await db.all('SELECT s3_key, recorded_at FROM recordings WHERE session_id=?', sessionId);
  res.json(rows);
});

app.get('/recordings/:sessionId/playback', authMiddleware, async (req, res) => {
  const { sessionId } = req.params;
  const db = await dbPromise;
  const rows = await db.all('SELECT s3_key FROM recordings WHERE session_id=? ORDER BY recorded_at', sessionId);
  res.json({ files: rows.map(r => r.s3_key) });
});

app.get('/workflows', authMiddleware, async (req, res) => {
  const db = await dbPromise;
  const rows = await db.all('SELECT id,name FROM workflows');
  res.json(rows);
});

app.post('/workflows/:id/start', authMiddleware, (req, res) => {
  res.json({ workflow: req.params.id, status: 'started' });
});

app.post('/sandbox/run', authMiddleware, (req, res) => {
  res.json({ output: 'sandbox execution placeholder' });
});

const port = process.env.PORT || 3000;
httpServer.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
