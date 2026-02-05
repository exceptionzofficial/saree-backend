const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { TABLES, getItem, putItem, scanTable } = require('../services/dynamodb');

const USERS_TABLE = 'Saree_Users';
const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret_key';

// Register
router.post('/register', async (req, res) => {
    try {
        const { name, mobile, email, address, password, referralId } = req.body;

        // Check if user already exists
        const existingUser = await getItem(USERS_TABLE, { mobile });
        if (existingUser) {
            return res.status(400).json({ error: 'User with this mobile number already exists' });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        const newUser = {
            id: uuidv4(),
            name,
            mobile,
            email,
            address,
            password: hashedPassword,
            referralId: referralId || '',
            isMember: false,
            createdAt: new Date().toISOString()
        };

        await putItem(USERS_TABLE, newUser);

        // Credit Referrer if they used a referral ID
        if (referralId) {
            try {
                // Find all memberships to find one with matching referral code
                const memberships = await scanTable(TABLES.MEMBERSHIPS);
                const referrer = memberships.find(m =>
                    m.referralCode &&
                    m.referralCode.trim().toUpperCase() === referralId.trim().toUpperCase() &&
                    m.status === 'active'
                );

                if (referrer) {
                    // Update referrer's data
                    referrer.referralCount = (Number(referrer.referralCount) || 0) + 1;
                    referrer.referrals = referrer.referrals || [];
                    referrer.referrals.push({
                        name: name,
                        email: email, // Optional: tracking who registered
                        date: new Date().toISOString(),
                        type: 'registration' // Marked as registration referral
                    });

                    // Check milestones for referrer - only update status, don't auto-claim
                    if (referrer.referralCount >= 7 && referrer.status !== 'completed') {
                        referrer.status = 'completed';
                        referrer.completedAt = new Date().toISOString();

                        // Reset referrer's isMember to false in Users table so they can become member again
                        try {
                            const users = await scanTable(TABLES.USERS);
                            const referrerUser = users.find(u => u.email === referrer.email);
                            if (referrerUser) {
                                referrerUser.isMember = false;
                                await putItem(TABLES.USERS, referrerUser);
                            }
                        } catch (uErr) {
                            console.warn('Could not reset referrer isMember status:', uErr.message);
                        }
                    }

                    await putItem(TABLES.MEMBERSHIPS, referrer);
                }
            } catch (refError) {
                console.error('Error crediting referrer during registration:', refError);
            }
        }

        // Create token
        const token = jwt.sign({ mobile: newUser.mobile, id: newUser.id }, JWT_SECRET, { expiresIn: '7d' });

        // Remove password from response
        const { password: _, ...userResponse } = newUser;

        res.status(201).json({ user: userResponse, token });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ error: 'Registration failed' });
    }
});

// Login
router.post('/login', async (req, res) => {
    try {
        const { mobile, password } = req.body;

        const user = await getItem(USERS_TABLE, { mobile });
        if (!user) {
            return res.status(400).json({ error: 'Invalid mobile number or password' });
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(400).json({ error: 'Invalid mobile number or password' });
        }

        // Create token
        const token = jwt.sign({ mobile: user.mobile, id: user.id }, JWT_SECRET, { expiresIn: '7d' });

        // Remove password from response
        const { password: _, ...userResponse } = user;

        res.json({ user: userResponse, token });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Login failed' });
    }
});

// Get Profile
router.get('/profile', async (req, res) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const decoded = jwt.verify(token, JWT_SECRET);
        const user = await getItem(USERS_TABLE, { mobile: decoded.mobile });

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        const { password: _, ...userResponse } = user;
        res.json(userResponse);
    } catch (error) {
        console.error('Profile fetch error:', error);
        res.status(401).json({ error: 'Unauthorized or token expired' });
    }
});

module.exports = router;
