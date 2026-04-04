require('dotenv').config();
const express  = require('express');
const router   = express.Router();
const db       = require('../db');
const ExcelJS  = require('exceljs');
const { sendStatusEmail } = require('../utils/mailer');

// ── Submit Complaint ───────────────────────────────────────
router.post('/submit', (req, res) => {
  const { user_id, title, description, category, priority } = req.body;
  console.log('Submit received:', req.body);

  if (!user_id || !title || !description || !category)
    return res.json({ success: false, message: 'All fields are required.' });

  db.query(
    'INSERT INTO complaints (user_id,title,description,category,priority) VALUES (?,?,?,?,?)',
    [user_id, title, description, category, priority || 'Medium'],
    (err, result) => {
      if (err) { console.error('DB Error:', err); return res.json({ success: false, message: err.message }); }
      res.json({ success: true, message: 'Complaint submitted!', id: result.insertId });
    }
  );
});

// ── My Complaints ──────────────────────────────────────────
router.get('/mine/:user_id', (req, res) => {
  db.query(
    'SELECT * FROM complaints WHERE user_id=? ORDER BY created_at DESC',
    [req.params.user_id],
    (err, results) => {
      if (err) return res.json({ success: false, message: err.message });
      res.json({ success: true, data: results });
    }
  );
});

// ── All Complaints (Admin) ─────────────────────────────────
router.get('/all', (req, res) => {
  db.query(
    `SELECT complaints.*, users.name AS user_name, users.email AS user_email
     FROM complaints JOIN users ON complaints.user_id=users.id
     ORDER BY complaints.created_at DESC`,
    (err, results) => {
      if (err) return res.json({ success: false, message: err.message });
      res.json({ success: true, data: results });
    }
  );
});

// ── Stats (Admin) ──────────────────────────────────────────
router.get('/stats', (req, res) => {
  db.query(
    `SELECT COUNT(*) AS total,
       SUM(status='Pending')     AS pending,
       SUM(status='In Progress') AS inprogress,
       SUM(status='Resolved')    AS resolved
     FROM complaints`,
    (err, results) => {
      if (err) return res.json({ success: false, message: err.message });
      res.json({ success: true, data: results[0] });
    }
  );
});

// ── Update Status + Send Email ─────────────────────────────
router.put('/status/:id', (req, res) => {
  const { status, admin_note } = req.body;
  db.query(
    'UPDATE complaints SET status=?, admin_note=? WHERE id=?',
    [status, admin_note || '', req.params.id],
    (err) => {
      if (err) return res.json({ success: false, message: err.message });

      db.query(
        `SELECT users.email, users.name, complaints.title
         FROM complaints JOIN users ON complaints.user_id=users.id
         WHERE complaints.id=?`,
        [req.params.id],
        (err2, results) => {
          if (!err2 && results.length) {
            const { email, name, title } = results[0];
            sendStatusEmail(email, name, title, status, admin_note);
          }
        }
      );
      res.json({ success: true, message: 'Status updated.' });
    }
  );
});

// ── Public Track Complaint ─────────────────────────────────
router.get('/track/:id', (req, res) => {
  db.query(
    `SELECT complaints.id, complaints.title, complaints.status,
            complaints.category, complaints.priority,
            complaints.admin_note, complaints.created_at,
            users.name AS user_name
     FROM complaints JOIN users ON complaints.user_id=users.id
     WHERE complaints.id=?`,
    [req.params.id],
    (err, results) => {
      if (err || results.length === 0)
        return res.json({ success: false, message: 'Complaint not found.' });
      res.json({ success: true, data: results[0] });
    }
  );
});

// ── Export to Excel (Admin) ────────────────────────────────
router.get('/export', async (req, res) => {
  db.query(
    `SELECT complaints.id, users.name AS user_name, users.email,
            complaints.title, complaints.category, complaints.priority,
            complaints.status, complaints.created_at
     FROM complaints JOIN users ON complaints.user_id=users.id
     ORDER BY complaints.created_at DESC`,
    async (err, results) => {
      if (err) return res.json({ success: false });

      const workbook  = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Complaints');

      worksheet.columns = [
        { header: 'ID',        key: 'id',          width: 8  },
        { header: 'Name',      key: 'user_name',   width: 20 },
        { header: 'Email',     key: 'email',        width: 25 },
        { header: 'Title',     key: 'title',        width: 30 },
        { header: 'Category',  key: 'category',     width: 18 },
        { header: 'Priority',  key: 'priority',     width: 12 },
        { header: 'Status',    key: 'status',       width: 15 },
        { header: 'Date',      key: 'created_at',   width: 20 },
      ];

      results.forEach(r => worksheet.addRow(r));

      // Style header row
      worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
      worksheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4F8EF7' } };

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename=complaints.xlsx');
      await workbook.xlsx.write(res);
      res.end();
    }
  );
});

// ── Delete Complaint ───────────────────────────────────────
router.delete('/:id', (req, res) => {
  db.query('DELETE FROM complaints WHERE id=?', [req.params.id], (err) => {
    if (err) return res.json({ success: false, message: err.message });
    res.json({ success: true });
  });
});

module.exports = router;