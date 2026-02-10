const express = require('express');
const router = express.Router();
const { putItem, getItem, scanTable } = require('../services/dynamodb');

const SETTINGS_TABLE = 'Saree_Settings';
const SETTINGS_KEY = 'store_settings';

const defaultSettings = {
    key: SETTINGS_KEY,
    upiId: 'gurubagavan@upi',
    storeName: 'Gurubagavan Sarees',
    storeEmail: 'contact@gurubagavan.com',
    storePhone: '+91 98765 43210',
    storeAddress: '123 Fashion Street, Silk Bazaar, Chennai - 600001',
    shippingCharge: 99,
    freeShippingThreshold: 2000,
    membershipPrice: 999,
    membershipPlans: [
        {
            id: 'premium',
            name: 'Premium Member',
            price: 999,
            cashbackEnabled: true,
            cashbackGoal: 5,
            goldEnabled: true,
            goldGoal: 7,
            features: [
                '✔ Unique Referral Code',
                '✔ Refer & Earn Program',
                '✔ Money Back for 5 Referrals',
                '✔ Gold Coin for 7 Referrals',
                'Priority Doorstep Delivery'
            ]
        },
        {
            id: 'elite',
            name: 'Elite Member',
            price: 1999,
            cashbackEnabled: true,
            cashbackGoal: 3,
            goldEnabled: true,
            goldGoal: 5,
            features: [
                '✔ Everything in Premium',
                '✔ Faster Money Back (3 Referrals)',
                '✔ Faster Gold Coin (5 Referrals)',
                '✔ Personal Stylist Consultation',
                '✔ Free Gift on Every Purchase'
            ]
        }
    ],
    announcements: [],
    updatedAt: new Date().toISOString()
};

// GET settings
router.get('/', async (req, res) => {
    try {
        const settings = await getItem(SETTINGS_TABLE, { key: SETTINGS_KEY });
        if (settings) {
            res.json(settings);
        } else {
            // Return default settings if none exist
            res.json(defaultSettings);
        }
    } catch (error) {
        console.error('Error fetching settings:', error);
        res.status(500).json({ error: 'Failed to fetch settings' });
    }
});

// PUT update settings
router.put('/', async (req, res) => {
    try {
        const updatedSettings = {
            key: SETTINGS_KEY,
            ...req.body,
            updatedAt: new Date().toISOString()
        };

        await putItem(SETTINGS_TABLE, updatedSettings);
        res.json(updatedSettings);
    } catch (error) {
        console.error('Error updating settings:', error);
        res.status(500).json({ error: 'Failed to update settings' });
    }
});

module.exports = router;
