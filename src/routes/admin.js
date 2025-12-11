const express = require('express');
const Joi = require('joi');
const auth = require('../middleware/auth');
const Cv = require('../models/Cv');

const router = express.Router();

const statusSchema = Joi.object({
  status: Joi.string().valid('pending', 'approved', 'rejected').required()
});

router.use(auth('admin'));

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


