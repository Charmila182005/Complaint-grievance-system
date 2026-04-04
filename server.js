require('dotenv').config();
const express    = require('express');
const cors       = require('cors');
const bodyParser = require('body-parser');
const session    = require('express-session');
const path       = require('path');
const os         = require('os');

const app  = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

app.use(session({
  secret: 'cgms_secret_key_2024',
  resave: false,
  saveUninitialized: true,
  cookie: { maxAge: 24 * 60 * 60 * 1000 }
}));

const authRoutes      = require('./routes/auth');
const complaintRoutes = require('./routes/complaints');

app.use('/api/auth',       authRoutes);
app.use('/api/complaints', complaintRoutes);

app.get('/',          (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));
app.get('/dashboard', (req, res) => res.sendFile(path.join(__dirname, 'public', 'dashboard.html')));
app.get('/admin',     (req, res) => res.sendFile(path.join(__dirname, 'public', 'admin.html')));
app.get('/track',     (req, res) => res.sendFile(path.join(__dirname, 'public', 'track.html')));

app.get('/api/session', (req, res) => {
  if (req.session.user) {
    res.json({ loggedIn: true, user: req.session.user });
  } else {
    res.json({ loggedIn: false });
  }
});

// Helper function to get your laptop's local network IP
function getLocalIP() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return 'localhost';
}

const HOST = '0.0.0.0'; // Listen on all devices
const LOCAL_IP = getLocalIP();

app.listen(PORT, HOST, () => {
  console.log('');
  console.log('╔══════════════════════════════════════════╗');
  console.log('║  Complaint & Grievance Management System  ║');
  console.log('╠══════════════════════════════════════════╣');
  console.log(`║   Server  →  http://localhost:${PORT}        ║`);
  console.log(`║   Network →  http://${LOCAL_IP}:${PORT}        ║`);
  console.log('║   Admin   →  admin@cgms.com / password   ║');
  console.log(`║   Track   →  http://${LOCAL_IP}:${PORT}/track  ║`);
  console.log('╚══════════════════════════════════════════╝');
});