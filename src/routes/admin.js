const express = require('express');
const Joi = require('joi');
const auth = require('../middleware/auth');
const Cv = require('../models/Cv');
const rateLimit = require('express-rate-limit');
const ipKeyGenerator = rateLimit.ipKeyGenerator;

const router = express.Router();

const statusSchema = Joi.object({
  status: Joi.string().valid('pending', 'approved', 'rejected').required()
});

router.use(auth('admin'));

// Admin-specific rate limiter (per-user if authenticated, otherwise fallback to IP)
const adminLimiter = rateLimit({
  windowMs: (process.env.ADMIN_RATE_LIMIT_WINDOW_MINUTES ? parseInt(process.env.ADMIN_RATE_LIMIT_WINDOW_MINUTES, 10) : 15) * 60 * 1000,
  max: process.env.ADMIN_RATE_LIMIT_MAX ? parseInt(process.env.ADMIN_RATE_LIMIT_MAX, 10) : 1000,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req /*, res */) => {
    // Use the authenticated user's id if available so admins don't share rate quota by IP
    // When falling back to IP, call express-rate-limit's ipKeyGenerator helper
    // to correctly generate a key for IPv6 (prevents bypassing rate limits).
    return req.user && req.user.id ? String(req.user.id) : ipKeyGenerator(req.ip);
  },
  handler: (req, res /*, next */) => {
    console.warn(`Admin rate limit exceeded: user=${req.user?.id || 'unknown'}, ip=${req.ip}, route=${req.originalUrl}`);
    const retryAfterSeconds = Math.ceil((process.env.ADMIN_RATE_LIMIT_WINDOW_MINUTES ? parseInt(process.env.ADMIN_RATE_LIMIT_WINDOW_MINUTES, 10) : 15) * 60);
    res.set('Retry-After', String(retryAfterSeconds));
    res.status(429).json({ message: 'Too many admin requests, please try again later.' });
  }
});

router.use(adminLimiter);

router.get('/cvs', async (req, res) => {
  try {
    const cvs = await Cv.find().populate('user', 'name email');
    return res.json(cvs);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error' });
  }
});

router.get('/cvs/:id', async (req, res) => {
  try {
    const cv = await Cv.findById(req.params.id).populate('user', 'name email');
    if (!cv) {
      return res.status(404).json({ message: 'CV not found' });
    }
    return res.json(cv);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error' });
  }
});

router.patch('/cvs/:id/status', async (req, res) => {
  try {
    const { error, value } = statusSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ message: error.details[0].message });
    }

    const cv = await Cv.findById(req.params.id);
    if (!cv) {
      return res.status(404).json({ message: 'CV not found' });
    }

    cv.status = value.status;
    const updated = await cv.save();
    return res.json(updated);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error' });
  }
});

router.delete('/cvs/:id', async (req, res) => {
  try {
    const cv = await Cv.findByIdAndDelete(req.params.id);
    if (!cv) {
      return res.status(404).json({ message: 'CV not found' });
    }
    return res.json({ message: 'CV deleted' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;


