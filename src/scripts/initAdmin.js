require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const bcrypt = require('bcryptjs');
const { TABLES, putItem, getItem } = require('../services/dynamodb');

const DEFAULT_ADMIN = {
    username: 'gurubagavansarees',
    password: 'gurubagavan@123'
};

async function initAdmin() {
    console.log('🚀 Initializing Admin Credentials in Saree_Settings...');

    try {
        // Hash the default password
        const hashedPassword = await bcrypt.hash(DEFAULT_ADMIN.password, 10);

        const adminData = {
            key: 'admin_credentials',
            username: DEFAULT_ADMIN.username,
            password: hashedPassword,
            updatedAt: new Date().toISOString()
        };

        // Check if already exists
        const existing = await getItem(TABLES.SETTINGS, { key: 'admin_credentials' });

        if (existing) {
            console.log('⚠️ Admin credentials already exist in Saree_Settings.');
            console.log('Use the change password feature in the settings page to update.');
            return;
        }

        await putItem(TABLES.SETTINGS, adminData);
        console.log('✅ Admin credentials initialized successfully!');
        console.log(`Username: ${DEFAULT_ADMIN.username}`);
        console.log('Password: (the default one)');
    } catch (error) {
        console.error('❌ Failed to initialize admin:', error.message);
        process.exit(1);
    }
}

initAdmin();
