const express = require('express');
const Joi = require('joi');
const auth = require('../middleware/auth');
const Cv = require('../models/Cv');

const router = express.Router();

const cvSchema = Joi.object({
  fullName: Joi.string()
    .trim()
    .min(3)
    .max(120)
    .pattern(/^[A-Za-z][A-Za-z\s.'-]*$/)
    .messages({
      'string.pattern.base': 'Full name may only include letters, spaces, apostrophes, periods, or dashes.'
    })
    .required()
    .strict(),
  phone: Joi.string()
    .trim()
    .pattern(/^\+?[0-9]{7,15}$/)
    .messages({ 'string.pattern.base': 'Phone must contain 7-15 digits and may start with +.' })
    .required()
    .strict(),
  address: Joi.string()
    .trim()
    .min(5)
    .max(200)
    .pattern(/^[A-Za-z0-9\s,.'#-]+$/)
    .messages({ 'string.pattern.base': 'Address contains invalid characters.' })
    .required()
    .strict(),
  education: Joi.string()
    .trim()
    .min(10)
    .max(500)
    .required()
    .strict(),
  experience: Joi.string()
    .trim()
    .min(10)
    .max(1000)
    .required()
    .strict(),
  skills: Joi.string()
    .trim()
    .pattern(/^[A-Za-z0-9,\s.'-]{3,500}$/)
    .messages({ 'string.pattern.base': 'Skills should be comma separated words only.' })
    .required()
    .strict()
}).prefs({ abortEarly: false, stripUnknown: true });

router.post('/', auth(), async (req, res) => {
  try {
    const { error, value } = cvSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ message: error.details[0].message });
    }

    const existing = await Cv.findOne({ user: req.user.id });
    if (existing) {
      return res.status(400).json({ message: 'CV already submitted. You can update it.' });
    }

    const cv = await Cv.create({
      ...value,
      user: req.user.id
    });

    // Populate user details for client-side convenience
    await cv.populate('user', 'name email');

    // Emit real-time event to admin clients
    try {
      const io = req.app.get('io');
      if (io) io.emit('cv:created', { _id: cv._id, fullName: cv.fullName, user: cv.user, status: cv.status, createdAt: cv.createdAt });
    } catch (emitErr) {
      console.warn('Failed to emit cv:created event:', emitErr);
    }

    return res.status(201).json(cv);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error' });
  }
});

router.get('/me', auth(), async (req, res) => {
  try {
    const cv = await Cv.findOne({ user: req.user.id });
    return res.json(cv || null);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error' });
  }
});

router.put('/:id', auth(), async (req, res) => {
  try {
    const { error, value } = cvSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ message: error.details[0].message });
    }

    const cv = await Cv.findOne({ _id: req.params.id, user: req.user.id });
    if (!cv) {
      return res.status(404).json({ message: 'CV not found' });
    }

    if (cv.status !== 'pending') {
      return res.status(400).json({ message: 'Only pending CVs can be edited' });
    }

    Object.assign(cv, value);
    const updated = await cv.save();

    try {
      const io = req.app.get('io');
      if (io) io.emit('cv:updated', { _id: updated._id, fullName: updated.fullName, user: updated.user, status: updated.status, updatedAt: updated.updatedAt });
    } catch (emitErr) {
      console.warn('Failed to emit cv:updated event:', emitErr);
    }

    return res.json(updated);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error' });
  }
});

router.delete('/:id', auth(), async (req, res) => {
  try {
    const cv = await Cv.findOneAndDelete({ _id: req.params.id, user: req.user.id });
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


