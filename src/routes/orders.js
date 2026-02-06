const express = require('express');
const router = express.Router();
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const { TABLES, putItem, getItem, scanTable } = require('../services/dynamodb');
const { uploadImage } = require('../services/s3');
const { sendOrderConfirmation, sendNewOrderNotification, sendOrderStatusUpdate } = require('../services/email');

// Configure multer for screenshot upload
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 }
});

// GET all orders
router.get('/', async (req, res) => {
    try {
        const orders = await scanTable(TABLES.ORDERS);
        // Sort by createdAt descending
        orders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        res.json(orders);
    } catch (error) {
        console.error('Error fetching orders:', error);
        res.status(500).json({ error: 'Failed to fetch orders' });
    }
});

// GET single order by ID
router.get('/:orderId', async (req, res) => {
    try {
        const orders = await scanTable(TABLES.ORDERS);
        const order = orders.find(o => o.orderId === req.params.orderId);

        if (!order) {
            return res.status(404).json({ error: 'Order not found' });
        }
        res.json(order);
    } catch (error) {
        console.error('Error fetching order:', error);
        res.status(500).json({ error: 'Failed to fetch order' });
    }
});

// POST create new order with payment screenshot upload
router.post('/', upload.single('paymentScreenshot'), async (req, res) => {
    try {
        // Parse JSON data from form-data
        const orderData = req.body.orderData ? JSON.parse(req.body.orderData) : req.body;
        const { customer, items, subtotal, shipping, total, paymentMethod } = orderData;

        // Upload screenshot to S3 if present
        let paymentScreenshotUrl = '';
        if (req.file) {
            paymentScreenshotUrl = await uploadImage(
                req.file.buffer,
                `payment-${Date.now()}-${req.file.originalname}`,
                req.file.mimetype
            );
        }

        const orderId = `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
        const createdAt = new Date().toISOString();

        const order = {
            orderId,
            createdAt,
            customer,
            items,
            shippingAddress: customer,
            paymentMethod: paymentMethod || 'UPI',
            paymentScreenshotUrl,
            subtotal,
            shipping,
            total,
            status: 'pending',
            paymentStatus: paymentScreenshotUrl ? 'submitted' : 'pending',
            statusHistory: [
                { status: 'pending', date: createdAt, note: 'Order placed' }
            ]
        };

        await putItem(TABLES.ORDERS, order);

        // Send email notifications
        sendOrderConfirmation(order);
        sendNewOrderNotification(order);

        res.status(201).json(order);
    } catch (error) {
        console.error('Error creating order:', error);
        res.status(500).json({ error: 'Failed to create order' });
    }
});

// PUT update order status
router.put('/:orderId/status', async (req, res) => {
    try {
        const { status, note } = req.body;

        const orders = await scanTable(TABLES.ORDERS);
        const order = orders.find(o => o.orderId === req.params.orderId);

        if (!order) {
            return res.status(404).json({ error: 'Order not found' });
        }

        // Update status
        order.status = status;
        order.statusHistory.push({
            status,
            date: new Date().toISOString(),
            note: note || `Status changed to ${status}`
        });
        order.updatedAt = new Date().toISOString();

        await putItem(TABLES.ORDERS, order);

        // Send status update email to customer
        sendOrderStatusUpdate(order);

        res.json(order);
    } catch (error) {
        console.error('Error updating order status:', error);
        res.status(500).json({ error: 'Failed to update order status' });
    }
});

// GET track order by ID (public endpoint)
router.get('/track/:orderId', async (req, res) => {
    try {
        const orders = await scanTable(TABLES.ORDERS);
        const order = orders.find(o => o.orderId === req.params.orderId);

        if (!order) {
            return res.status(404).json({ error: 'Order not found' });
        }

        // Return limited info for public tracking
        res.json({
            orderId: order.orderId,
            status: order.status,
            statusHistory: order.statusHistory,
            createdAt: order.createdAt,
            items: order.items.map(item => ({
                name: item.name,
                quantity: item.quantity
            }))
        });
    } catch (error) {
        console.error('Error tracking order:', error);
        res.status(500).json({ error: 'Failed to track order' });
    }
});

module.exports = router;
