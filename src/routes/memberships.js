const express = require('express');
const router = express.Router();
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const { TABLES, putItem, getItem, scanTable, deleteItem } = require('../services/dynamodb');
const { uploadImage } = require('../services/s3');

// Configure multer for screenshot upload
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 }
});

// Generate referral code
const generateReferralCode = (name) => {
    const prefix = name.substring(0, 3).toUpperCase();
    const suffix = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `${prefix}${suffix}`;
};

// GET all membership requests (admin)
router.get('/requests', async (req, res) => {
    try {
        const requests = await scanTable(TABLES.MEMBERSHIP_REQUESTS);
        res.json(requests);
    } catch (error) {
        console.error('Error fetching membership requests:', error);
        res.status(500).json({ error: 'Failed to fetch requests' });
    }
});

// GET all memberships (admin)
router.get('/', async (req, res) => {
    try {
        const memberships = await scanTable(TABLES.MEMBERSHIPS);
        res.json(memberships);
    } catch (error) {
        console.error('Error fetching memberships:', error);
        res.status(500).json({ error: 'Failed to fetch memberships' });
    }
});

// GET membership by email
router.get('/user/:email', async (req, res) => {
    try {
        const membership = await getItem(TABLES.MEMBERSHIPS, { email: req.params.email });
        res.json(membership || null);
    } catch (error) {
        console.error('Error fetching membership:', error);
        res.status(500).json({ error: 'Failed to fetch membership' });
    }
});

// GET pending request by email
router.get('/request/:email', async (req, res) => {
    try {
        const requests = await scanTable(TABLES.MEMBERSHIP_REQUESTS);
        const pending = requests.find(r => r.email === req.params.email && r.status === 'pending');
        res.json(pending || null);
    } catch (error) {
        console.error('Error fetching request:', error);
        res.status(500).json({ error: 'Failed to fetch request' });
    }
});

// POST submit payment request
router.post('/request', upload.single('screenshot'), async (req, res) => {
    try {
        const { name, email, mobile, referralCode } = req.body;

        // Check if already has active membership
        const existingMembership = await getItem(TABLES.MEMBERSHIPS, { email });
        if (existingMembership && existingMembership.status === 'active') {
            return res.status(400).json({ error: 'Already have an active membership' });
        }

        // Upload screenshot
        let screenshotUrl = '';
        if (req.file) {
            screenshotUrl = await uploadImage(req.file.buffer, req.file.originalname, req.file.mimetype);
        }

        const request = {
            id: uuidv4(),
            name,
            email,
            mobile,
            referralCode: referralCode || '',
            screenshotUrl,
            status: 'pending',
            submittedAt: new Date().toISOString()
        };

        await putItem(TABLES.MEMBERSHIP_REQUESTS, request);
        res.status(201).json(request);
    } catch (error) {
        console.error('Error submitting request:', error);
        res.status(500).json({ error: 'Failed to submit request' });
    }
});

// PUT approve membership request (admin)
router.put('/request/:id/approve', async (req, res) => {
    try {
        const request = await getItem(TABLES.MEMBERSHIP_REQUESTS, { id: req.params.id });
        if (!request) {
            return res.status(404).json({ error: 'Request not found' });
        }

        // Create membership
        const membership = {
            email: request.email,
            name: request.name,
            mobile: request.mobile,
            referralCode: generateReferralCode(request.name),
            referralCount: 0,
            referrals: [],
            moneyBackClaimed: false,
            goldCoinClaimed: false,
            status: 'active',
            activatedAt: new Date().toISOString()
        };

        await putItem(TABLES.MEMBERSHIPS, membership);

        // Update user's isMember status in Users table
        try {
            const users = await scanTable(TABLES.USERS);
            const user = users.find(u => u.email === request.email);
            if (user) {
                user.isMember = true;
                await putItem(TABLES.USERS, user);
            }
        } catch (userError) {
            console.warn('Could not update user isMember status:', userError.message);
        }

        // Update request status
        request.status = 'approved';
        request.approvedAt = new Date().toISOString();
        await putItem(TABLES.MEMBERSHIP_REQUESTS, request);

        // Credit the referrer if the new member used a referral code
        if (request.referralCode) {
            try {
                const memberships = await scanTable(TABLES.MEMBERSHIPS);
                const referrer = memberships.find(m =>
                    m.referralCode &&
                    m.referralCode.trim().toUpperCase() === request.referralCode.trim().toUpperCase() &&
                    (m.status === 'active' || m.status === 'completed')
                );

                if (referrer) {
                    // Update referrer's data
                    referrer.referralCount = (Number(referrer.referralCount) || 0) + 1;
                    referrer.referrals = referrer.referrals || [];
                    referrer.referrals.push({
                        name: request.name,
                        email: request.email,
                        date: new Date().toISOString(),
                        type: 'membership' // Marked as membership referral (they paid!)
                    });

                    // Check milestones - only update status, don't auto-claim rewards
                    if (referrer.referralCount >= 7 && referrer.status !== 'completed') {
                        referrer.status = 'completed';
                        referrer.completedAt = new Date().toISOString();

                        // Reset referrer's isMember so they can become member again
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
                    console.log(`Credited referrer ${referrer.email} with new referral from ${request.email}`);
                }
            } catch (refError) {
                console.error('Error crediting referrer:', refError);
            }
        }

        res.json({ membership, request });
    } catch (error) {
        console.error('Error approving request:', error);
        res.status(500).json({ error: 'Failed to approve request' });
    }
});

// PUT reject membership request (admin)
router.put('/request/:id/reject', async (req, res) => {
    try {
        const request = await getItem(TABLES.MEMBERSHIP_REQUESTS, { id: req.params.id });
        if (!request) {
            return res.status(404).json({ error: 'Request not found' });
        }

        request.status = 'rejected';
        request.rejectedAt = new Date().toISOString();
        await putItem(TABLES.MEMBERSHIP_REQUESTS, request);

        res.json(request);
    } catch (error) {
        console.error('Error rejecting request:', error);
        res.status(500).json({ error: 'Failed to reject request' });
    }
});

// POST add referral
router.post('/referral', async (req, res) => {
    try {
        const { referralCode, referredUserName } = req.body;

        // Find membership by referral code
        const memberships = await scanTable(TABLES.MEMBERSHIPS);
        const membership = memberships.find(m => m.referralCode === referralCode && m.status === 'active');

        if (!membership) {
            return res.status(404).json({ error: 'Invalid referral code' });
        }

        // Add referral
        membership.referralCount += 1;
        membership.referrals.push({
            name: referredUserName,
            date: new Date().toISOString()
        });

        // Check milestones - only update status, don't auto-claim rewards
        // User must submit claim form to get rewards
        if (membership.referralCount >= 7 && membership.status !== 'completed') {
            membership.status = 'completed';
            membership.completedAt = new Date().toISOString();

            // Reset user's isMember to false so they can become member again
            try {
                const users = await scanTable(TABLES.USERS);
                const user = users.find(u => u.email === membership.email);
                if (user) {
                    user.isMember = false;
                    await putItem(TABLES.USERS, user);
                }
            } catch (userError) {
                console.warn('Could not reset user isMember status:', userError.message);
            }
        }

        await putItem(TABLES.MEMBERSHIPS, membership);
        res.json(membership);
    } catch (error) {
        console.error('Error adding referral:', error);
        res.status(500).json({ error: 'Failed to add referral' });
    }
});

// POST submit reward claim
router.post('/claim', async (req, res) => {
    try {
        const claimData = req.body;
        const { type, email, membershipId } = claimData;

        // Verify membership exists and is eligible
        const membership = await getItem(TABLES.MEMBERSHIPS, { email });
        if (!membership) {
            return res.status(404).json({ error: 'Membership not found' });
        }

        // Create claim record
        const claim = {
            id: uuidv4(),
            ...claimData,
            status: 'pending',
            submittedAt: new Date().toISOString()
        };

        await putItem(TABLES.REWARD_CLAIMS, claim);

        // Update membership status to indicate claim is in progress
        if (type === 'cashback') {
            membership.moneyBackClaimed = 'pending_admin';
        } else if (type === 'gold') {
            membership.goldCoinClaimed = 'pending_admin';
            // If they are applying for Gold, they have already reached 7 referrals
            // and their status is likely already 'completed'.
        }

        await putItem(TABLES.MEMBERSHIPS, membership);

        res.status(201).json(claim);
    } catch (error) {
        console.error('Error submitting reward claim:', error);
        res.status(500).json({ error: 'Failed to submit reward claim' });
    }
});

// GET all reward claims (admin)
router.get('/claims', async (req, res) => {
    try {
        const claims = await scanTable(TABLES.REWARD_CLAIMS);
        // Sort by date, newest first
        claims.sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt));
        res.json(claims);
    } catch (error) {
        console.error('Error fetching reward claims:', error);
        res.status(500).json({ error: 'Failed to fetch reward claims' });
    }
});

// PUT update claim status (admin)
router.put('/claim/:id/status', async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body; // 'pending', 'in_progress', 'completed', 'rejected'

        // Get all claims and find the one with matching id
        const claims = await scanTable(TABLES.REWARD_CLAIMS);
        const claim = claims.find(c => c.id === id);

        if (!claim) {
            return res.status(404).json({ error: 'Claim not found' });
        }

        // Update claim status
        claim.status = status;
        claim.updatedAt = new Date().toISOString();
        await putItem(TABLES.REWARD_CLAIMS, claim);

        // If completed, update the membership record
        if (status === 'completed') {
            const membership = await getItem(TABLES.MEMBERSHIPS, { email: claim.email });
            if (membership) {
                if (claim.type === 'cashback') {
                    membership.moneyBackClaimed = true;
                } else if (claim.type === 'gold') {
                    membership.goldCoinClaimed = true;
                }
                await putItem(TABLES.MEMBERSHIPS, membership);
            }
        }

        res.json(claim);
    } catch (error) {
        console.error('Error updating claim status:', error);
        res.status(500).json({ error: 'Failed to update claim status' });
    }
});

module.exports = router;
