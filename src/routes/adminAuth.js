const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { TABLES, getItem, putItem } = require('../services/dynamodb');

const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret_key';

// Admin Login
router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        const adminCredentials = await getItem(TABLES.SETTINGS, { key: 'admin_credentials' });

        if (!adminCredentials) {
            return res.status(404).json({ error: 'Admin credentials not initialized' });
        }

        if (username !== adminCredentials.username) {
            return res.status(401).json({ error: 'Invalid username or password' });
        }

        const isPasswordValid = await bcrypt.compare(password, adminCredentials.password);
        if (!isPasswordValid) {
            return res.status(401).json({ error: 'Invalid username or password' });
        }

        // Create token
        const token = jwt.sign(
            { username: adminCredentials.username, role: 'admin' },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.json({
            token,
            user: {
                username: adminCredentials.username,
                role: 'admin'
            }
        });
    } catch (error) {
        console.error('Admin login error:', error);
        res.status(500).json({ error: 'Login failed' });
    }
});

// Middleware to verify admin token
const authenticateAdmin = (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        if (decoded.role !== 'admin') {
            return res.status(403).json({ error: 'Forbidden' });
        }
        req.admin = decoded;
        next();
    } catch (error) {
        return res.status(401).json({ error: 'Invalid or expired token' });
    }
};

// Change Password
router.put('/change-password', authenticateAdmin, async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;

        const adminCredentials = await getItem(TABLES.SETTINGS, { key: 'admin_credentials' });
        if (!adminCredentials) {
            return res.status(404).json({ error: 'Admin credentials not found' });
        }

        // Verify current password
        const isCurrentValid = await bcrypt.compare(currentPassword, adminCredentials.password);
        if (!isCurrentValid) {
            return res.status(400).json({ error: 'Incorrect current password' });
        }

        // Hash new password
        const hashedNewPassword = await bcrypt.hash(newPassword, 10);

        // Update in database
        const updatedAdmin = {
            ...adminCredentials,
            password: hashedNewPassword,
            updatedAt: new Date().toISOString()
        };

        await putItem(TABLES.SETTINGS, updatedAdmin);

        res.json({ message: 'Password updated successfully' });
    } catch (error) {
        console.error('Change password error:', error);
        res.status(500).json({ error: 'Failed to change password' });
    }
});

module.exports = router;
