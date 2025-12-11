const bcrypt = require('bcrypt');
const User = require('../models/User');

async function ensureAdmin() {
  try {
    const email = process.env.ADMIN_EMAIL || 'admin@123';
    const password = process.env.ADMIN_PASSWORD || 'password@123';

    let admin = await User.findOne({ email });
    const hash = await bcrypt.hash(password, 10);

    if (!admin) {
      admin = await User.create({
        name: 'System Admin',
        email,
        password: hash,
        role: 'admin'
      });
      console.log(`Default admin (${email}) created.`);
    } else {
      admin.password = hash;
      admin.role = 'admin';
      await admin.save();
      console.log(`Default admin (${email}) updated.`);
    }
  } catch (err) {
    console.error('Unable to ensure default admin exists:', err.message);
  }
}

module.exports = ensureAdmin;


