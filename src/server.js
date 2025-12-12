const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const dotenv = require('dotenv');
const cookieParser = require('cookie-parser');

dotenv.config();

const authRoutes = require('./routes/auth');
const cvRoutes = require('./routes/cv');
const adminRoutes = require('./routes/admin');
const ensureAdmin = require('./utils/ensureAdmin');

const app = express();

app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  contentSecurityPolicy: false
}));
app.use(cors({ origin: true, credentials: true }));

const RATE_LIMIT_WINDOW_MIN = (process.env.RATE_LIMIT_WINDOW_MINUTES && parseInt(process.env.RATE_LIMIT_WINDOW_MINUTES, 10)) || 15;
const RATE_LIMIT_MAX = (process.env.RATE_LIMIT_MAX && parseInt(process.env.RATE_LIMIT_MAX, 10)) || 100;

const limiter = rateLimit({
  windowMs: RATE_LIMIT_WINDOW_MIN * 60 * 1000,
  max: RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res /*, next */) => {
    console.warn(`Rate limit exceeded: IP=${req.ip}, route=${req.originalUrl}`);
    const retryAfterSeconds = Math.ceil((RATE_LIMIT_WINDOW_MIN * 60));
    res.set('Retry-After', String(retryAfterSeconds));
    res.status(429).json({ message: 'Too many requests from this IP, please try again later.' });
  }
});
app.use('/api/', limiter);

app.use(express.json({ limit: '10mb' }));
app.use(cookieParser());
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(express.static('public'));

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/crud_int';
const PORT = process.env.PORT || 4000;

mongoose
  .connect(MONGODB_URI)
  .then(async () => {
    console.log('MongoDB connected');
    await ensureAdmin();
  })
  .catch((err) => console.error('MongoDB connection error:', err));

app.use('/api/auth', authRoutes);
app.use('/api/cv', cvRoutes);
app.use('/api/admin', adminRoutes);

app.get('/', (req, res) => {
  res.sendFile('index.html', { root: 'public' });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});


