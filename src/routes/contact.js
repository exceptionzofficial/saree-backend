const express = require('express');
const router = express.Router();
const { sendContactFormNotification } = require('../services/email');

// POST /api/contact - Submit contact form
router.post('/', async (req, res) => {
    try {
        const { name, email, phone, subject, message } = req.body;

        // Validation
        if (!name || !email || !phone || !subject || !message) {
            return res.status(400).json({
                error: 'All fields are required',
                message: 'Please fill in all the fields'
            });
        }

        // Email format validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({
                error: 'Invalid email',
                message: 'Please provide a valid email address'
            });
        }

        // Send email notification to admin
        await sendContactFormNotification({ name, email, phone, subject, message });

        res.json({
            success: true,
            message: 'Your message has been sent successfully! We will get back to you shortly.'
        });
    } catch (error) {
        console.error('Contact form error:', error);
        res.status(500).json({
            error: 'Failed to send message',
            message: 'Something went wrong. Please try again later or contact us directly.'
        });
    }
});

module.exports = router;
