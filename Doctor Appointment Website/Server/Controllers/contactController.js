import { sendEmail } from '../Utils/mailer.js';

export const sendContactMessage = async (req, res) => {
  try {
    const { name, email, message } = req.body;

    // Validate required fields
    if (!name || !email || !message) {
      return res.status(400).json({
        success: false,
        message: 'All fields are required'
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid email address'
      });
    }

    // Prepare email content
    const emailSubject = `New Contact Form Message from ${name}`;
    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2c5aa0; border-bottom: 2px solid #2c5aa0; padding-bottom: 10px;">
          New Contact Form Submission
        </h2>
        
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="color: #333; margin-top: 0;">Contact Details</h3>
          <p><strong>Name:</strong> ${name}</p>
          <p><strong>Email:</strong> ${email}</p>
          <p><strong>Submitted:</strong> ${new Date().toLocaleString()}</p>
        </div>
        
        <div style="background-color: #ffffff; padding: 20px; border: 1px solid #e9ecef; border-radius: 8px;">
          <h3 style="color: #333; margin-top: 0;">Message</h3>
          <p style="line-height: 1.6; color: #555;">${message.replace(/\n/g, '<br>')}</p>
        </div>
        
        <div style="margin-top: 20px; padding: 15px; background-color: #e7f3ff; border-radius: 8px;">
          <p style="margin: 0; color: #2c5aa0; font-size: 14px;">
            This message was sent through the Health Ways contact form.
          </p>
        </div>
      </div>
    `;

    const emailText = `
New Contact Form Message from ${name}

Contact Details:
- Name: ${name}
- Email: ${email}
- Submitted: ${new Date().toLocaleString()}

Message:
${message}

This message was sent through the Health Ways contact form.
    `;

    // Send email to admin
    const emailResult = await sendEmail({
      to: 'aatifshah15@gmail.com', // Admin email
      subject: emailSubject,
      html: emailHtml,
      text: emailText
    });

    if (!emailResult.success) {
      console.error('Email sending failed:', emailResult.error);
      return res.status(500).json({
        success: false,
        message: 'Failed to send message. Please try again later.'
      });
    }

    // Send confirmation email to user
    const confirmationHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2c5aa0; border-bottom: 2px solid #2c5aa0; padding-bottom: 10px;">
          Thank You for Contacting Health Ways
        </h2>
        
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p>Dear ${name},</p>
          <p>Thank you for reaching out to us! We have received your message and our team will get back to you within 24 hours.</p>
        </div>
        
        <div style="background-color: #ffffff; padding: 20px; border: 1px solid #e9ecef; border-radius: 8px;">
          <h3 style="color: #333; margin-top: 0;">Your Message</h3>
          <p style="line-height: 1.6; color: #555;">${message.replace(/\n/g, '<br>')}</p>
        </div>
        
        <div style="margin-top: 20px; padding: 15px; background-color: #e7f3ff; border-radius: 8px;">
          <p style="margin: 0; color: #2c5aa0; font-size: 14px;">
            <strong>Contact Information:</strong><br>
            📍 Dabgari Garden, Peshawar<br>
            📞 0332-9602525<br>
            ✉ info@healthways.com
          </p>
        </div>
      </div>
    `;

    const confirmationText = `
Dear ${name},

Thank you for reaching out to us! We have received your message and our team will get back to you within 24 hours.

Your Message:
${message}

Contact Information:
📍 Dabgari Garden, Peshawar
📞 0332-9602525
✉ info@healthways.com
    `;

    // Send confirmation email to user
    await sendEmail({
      to: email,
      subject: 'Thank You for Contacting Health Ways',
      html: confirmationHtml,
      text: confirmationText
    });

    res.status(200).json({
      success: true,
      message: 'Message sent successfully! We will get back to you within 24 hours.'
    });

  } catch (error) {
    console.error('Contact form error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error. Please try again later.'
    });
  }
};
