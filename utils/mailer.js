require('dotenv').config();
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

function sendStatusEmail(toEmail, userName, complaintTitle, newStatus, adminNote) {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to:   toEmail,
    subject: `Your Complaint Status Updated — ${newStatus}`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:30px;background:#f9f9f9;border-radius:10px;">
        <h2 style="color:#4f8ef7;">📋 Complaint & Grievance Management System</h2>
        <p>Dear <strong>${userName}</strong>,</p>
        <p>Your complaint <strong>"${complaintTitle}"</strong> status has been updated.</p>
        <div style="background:#fff;padding:20px;border-radius:8px;margin:20px 0;border-left:4px solid #4f8ef7;">
          <p><strong>New Status:</strong> ${newStatus}</p>
          <p><strong>Admin Response:</strong> ${adminNote || 'No note added.'}</p>
        </div>
        <p>Login to view full details:
          <a href="http://localhost:3000" style="color:#4f8ef7;">Click Here</a>
        </p>
        <p style="color:#999;font-size:12px;margin-top:20px;">
          This is an automated message from CGMS. Please do not reply.
        </p>
      </div>
    `
  };

  transporter.sendMail(mailOptions, (err, info) => {
    if (err) console.error('❌ Email error:', err.message);
    else     console.log('📧 Email sent:', info.response);
  });
}

module.exports = { sendStatusEmail };