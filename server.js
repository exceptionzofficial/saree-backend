require('dotenv').config();

const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
    origin: [
        'http://localhost:5173',
        'http://localhost:3000',
        'https://saree-website.vercel.app',
        'https://www.gurubagavansarees.com',
        'https://gurubagavansarees.com'
    ],
    credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Import routes
const productsRoutes = require('./src/routes/products');
const ordersRoutes = require('./src/routes/orders');
const membershipsRoutes = require('./src/routes/memberships');
const categoriesRoutes = require('./src/routes/categories');
const authRoutes = require('./src/routes/auth');
const settingsRoutes = require('./src/routes/settings');

// API Routes
app.use('/api/products', productsRoutes);
app.use('/api/orders', ordersRoutes);
app.use('/api/memberships', membershipsRoutes);
app.use('/api/categories', categoriesRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/settings', settingsRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({
        status: 'OK',
        message: 'Saree Ecommerce API is running',
        timestamp: new Date().toISOString()
    });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(500).json({
        error: 'Internal Server Error',
        message: err.message
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ error: 'Route not found' });
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`📦 Products API: http://localhost:${PORT}/api/products`);
    console.log(`📋 Orders API: http://localhost:${PORT}/api/orders`);
    console.log(`👥 Memberships API: http://localhost:${PORT}/api/memberships`);
});
