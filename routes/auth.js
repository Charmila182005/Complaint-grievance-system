const express = require('express');
const router  = express.Router();
const bcrypt  = require('bcryptjs');
const db      = require('../db');

router.post('/register', (req, res) => {
  const { name, email, password, phone } = req.body;
  if (!name || !email || !password)
    return res.json({ success: false, message: 'All fields are required.' });

  db.query('SELECT id FROM users WHERE email = ?', [email], (err, results) => {
    if (err)              return res.json({ success: false, message: 'Database error.' });
    if (results.length)   return res.json({ success: false, message: 'Email already registered.' });

    const hashed = bcrypt.hashSync(password, 10);
    db.query(
      'INSERT INTO users (name, email, password, phone, role) VALUES (?, ?, ?, ?, "user")',
      [name, email, hashed, phone || ''],
      (err2) => {
        if (err2) return res.json({ success: false, message: 'Registration failed.' });
        res.json({ success: true, message: 'Registered successfully! Please login.' });
      }
    );
  });
});

router.post('/login', (req, res) => {
  const { email, password } = req.body;
  db.query('SELECT * FROM users WHERE email = ?', [email], (err, results) => {
    if (err || results.length === 0)
      return res.json({ success: false, message: 'Invalid email or password.' });

    const user  = results[0];
    const match = bcrypt.compareSync(password, user.password);
    if (!match) return res.json({ success: false, message: 'Invalid email or password.' });

    req.session.user = { id: user.id, name: user.name, email: user.email, role: user.role };
    res.json({ success: true, user: req.session.user });
  });
});

router.post('/logout', (req, res) => {
  req.session.destroy();
  res.json({ success: true });
});

module.exports = router;