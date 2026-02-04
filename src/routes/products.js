const express = require('express');
const router = express.Router();
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const { TABLES, putItem, getItem, scanTable, updateItem, deleteItem } = require('../services/dynamodb');
const { uploadImage, deleteImage } = require('../services/s3');

// Configure multer for memory storage
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Only images are allowed'), false);
        }
    }
});

// GET all products
router.get('/', async (req, res) => {
    try {
        const products = await scanTable(TABLES.PRODUCTS);
        res.json(products);
    } catch (error) {
        console.error('Error fetching products:', error);
        res.status(500).json({ error: 'Failed to fetch products' });
    }
});

// GET single product by ID
router.get('/:id', async (req, res) => {
    try {
        const product = await getItem(TABLES.PRODUCTS, { id: req.params.id });
        if (!product) {
            return res.status(404).json({ error: 'Product not found' });
        }
        res.json(product);
    } catch (error) {
        console.error('Error fetching product:', error);
        res.status(500).json({ error: 'Failed to fetch product' });
    }
});

// POST create new product with image upload
router.post('/', upload.array('images', 5), async (req, res) => {
    try {
        const { name, price, originalPrice, category, description, material, color, weight, blouseIncluded } = req.body;

        // Upload images to S3
        const imageUrls = [];
        if (req.files && req.files.length > 0) {
            for (const file of req.files) {
                const url = await uploadImage(file.buffer, file.originalname, file.mimetype);
                imageUrls.push(url);
            }
        }

        // Generate slug from name
        const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

        const product = {
            id: uuidv4(),
            name,
            slug,
            price: parseFloat(price),
            originalPrice: parseFloat(originalPrice) || null,
            category,
            description,
            material,
            color,
            weight,
            blouseIncluded: blouseIncluded === 'true',
            images: imageUrls,
            rating: 0,
            reviews: 0,
            createdAt: new Date().toISOString()
        };

        await putItem(TABLES.PRODUCTS, product);
        res.status(201).json(product);
    } catch (error) {
        console.error('Error creating product:', error);
        res.status(500).json({ error: 'Failed to create product' });
    }
});

// PUT update product
router.put('/:id', upload.array('images', 5), async (req, res) => {
    try {
        const { name, price, originalPrice, category, description, material, color, weight, blouseIncluded, existingImages } = req.body;

        // Get existing product
        const existingProduct = await getItem(TABLES.PRODUCTS, { id: req.params.id });
        if (!existingProduct) {
            return res.status(404).json({ error: 'Product not found' });
        }

        // Handle images
        let imageUrls = existingImages ? JSON.parse(existingImages) : [];

        // Upload new images
        if (req.files && req.files.length > 0) {
            for (const file of req.files) {
                const url = await uploadImage(file.buffer, file.originalname, file.mimetype);
                imageUrls.push(url);
            }
        }

        // Generate slug
        const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

        const updatedProduct = {
            ...existingProduct,
            name,
            slug,
            price: parseFloat(price),
            originalPrice: parseFloat(originalPrice) || null,
            category,
            description,
            material,
            color,
            weight,
            blouseIncluded: blouseIncluded === 'true',
            images: imageUrls,
            updatedAt: new Date().toISOString()
        };

        await putItem(TABLES.PRODUCTS, updatedProduct);
        res.json(updatedProduct);
    } catch (error) {
        console.error('Error updating product:', error);
        res.status(500).json({ error: 'Failed to update product' });
    }
});

// DELETE product
router.delete('/:id', async (req, res) => {
    try {
        const product = await getItem(TABLES.PRODUCTS, { id: req.params.id });
        if (!product) {
            return res.status(404).json({ error: 'Product not found' });
        }

        // Delete images from S3
        if (product.images && product.images.length > 0) {
            for (const imageUrl of product.images) {
                await deleteImage(imageUrl);
            }
        }

        await deleteItem(TABLES.PRODUCTS, { id: req.params.id });
        res.json({ message: 'Product deleted successfully' });
    } catch (error) {
        console.error('Error deleting product:', error);
        res.status(500).json({ error: 'Failed to delete product' });
    }
});

module.exports = router;
