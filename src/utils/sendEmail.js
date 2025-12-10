import nodemailer from "nodemailer";

const sendEmail = async (options) => {
  // Create a transporter using your email service (Gmail, Outlook, Mailgun, etc.)
  // For Gmail, use an "App Password" if 2FA is enabled.
  const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST || "smtp.gmail.com",
    port: process.env.EMAIL_PORT || 587,
    secure: false, // true for 465, false for other ports
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
    tls: {
      rejectUnauthorized: false
    }
  });

  // Define email options
  const mailOptions = {
    from: `${process.env.FROM_NAME} <${process.env.EMAIL_USER}>`,
    to: options.email,
    subject: options.subject,
    text: options.message,
    html: options.html, // Optional: You can pass HTML content
  };

  // Send the email
  await transporter.sendMail(mailOptions);
};

export default sendEmail;
