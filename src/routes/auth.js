const express = require('express');
const bcrypt = require('bcrypt');
const Joi = require('joi');
const rateLimit = require('express-rate-limit');
const User = require('../models/User');
const { generateAccessToken, generateRefreshToken, verifyRefreshToken } = require('../utils/jwt');
const RevokedToken = require('../models/RevokedToken');

const router = express.Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res /*, next */) => {
    console.warn(`Auth rate limit exceeded for IP=${req.ip} route=${req.originalUrl}`);
    const retryAfterSeconds = Math.ceil((15 * 60));
    res.set('Retry-After', String(retryAfterSeconds));
    res.status(429).json({ message: 'Too many login attempts, please try again after 15 minutes.' });
  }
});

const adminIdentifier = process.env.ADMIN_EMAIL || 'admin@123';

const registerSchema = Joi.object({
  name: Joi.string()
    .trim()
    .min(2)
    .max(100)
    .pattern(/^[A-Za-z][A-Za-z\s.'-]*$/)
    .messages({
      'string.pattern.base': 'Name may only contain letters, spaces, apostrophes, periods, or dashes.'
    })
    .required()
    .strict(),
  email: Joi.string().trim().lowercase().email({ tlds: { allow: false } }).required().strict(),
  password: Joi.string()
    .min(8)
    .max(128)
    .pattern(/^(?=.*[A-Za-z])(?=.*\d).+$/)
    .messages({
      'string.pattern.base': 'Password must include at least one letter and one number.'
    })
    .required()
    .strict()
});

const loginSchema = Joi.object({
  email: Joi.alternatives()
    .try(
      Joi.string().trim().lowercase().email({ tlds: { allow: false } }),
      Joi.string().valid(adminIdentifier)
    )
    .messages({ 'alternatives.match': '"email" must be a valid email or admin ID' })
    .required()
    .strict(),
  password: Joi.string().min(8).max(128).required().strict()
});

router.post('/register', authLimiter, async (req, res) => {
  try {
    const { error, value } = registerSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ message: error.details[0].message });
    }

    const { name, email, password } = value;

    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(400).json({ message: 'Email already registered' });
    }

    const hash = await bcrypt.hash(password, 10);

    const isFirstUser = (await User.countDocuments()) === 0;

    const user = await User.create({
      name,
      email,
      password: hash,
      role: isFirstUser ? 'admin' : 'user'
    });

    return res.status(201).json({ message: 'Registered successfully', user: { id: user._id, email: user.email, role: user.role } });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error' });
  }
});

router.post('/login', authLimiter, async (req, res) => {
  try {
    const { error, value } = loginSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ message: error.details[0].message });
    }

    const { email, password } = value;
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const payload = { id: user._id, email: user.email, role: user.role };
    const accessToken = generateAccessToken(payload);
    const refreshToken = generateRefreshToken(payload);

    return res.json({
      token: accessToken,
      refreshToken,
      user: { id: user._id, email: user.email, role: user.role }
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error' });
  }
});

router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(400).json({ message: 'Refresh token required' });
    }

    const decoded = await verifyRefreshToken(refreshToken);

    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }

    const payload = { id: user._id, email: user.email, role: user.role };
    const newAccessToken = generateAccessToken(payload);

    return res.json({
      token: newAccessToken,
      user: { id: user._id, email: user.email, role: user.role }
    });
  } catch (err) {
    return res.status(401).json({ message: err.message || 'Invalid refresh token' });
  }
});

router.post('/logout', async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(400).json({ message: 'Refresh token required' });
    }

    const decoded = await verifyRefreshToken(refreshToken);
    const expiresAt = decoded.exp ? new Date(decoded.exp * 1000) : new Date(Date.now() + 1000 * 60 * 60 * 24);

    await RevokedToken.create({ token: refreshToken, expiresAt });

    return res.json({ message: 'Logged out' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;


