const express = require('express');
const router = express.Router();
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const { TABLES, putItem, getItem, scanTable, deleteItem } = require('../services/dynamodb');
const { uploadImage, deleteImage } = require('../services/s3');

// Add CATEGORIES to TABLES
const CATEGORIES_TABLE = 'Saree_Categories';

// Configure multer for image upload
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 }
});

// GET all categories
router.get('/', async (req, res) => {
    try {
        const categories = await scanTable(CATEGORIES_TABLE);
        // Sort by order field
        categories.sort((a, b) => (a.order || 0) - (b.order || 0));
        res.json(categories);
    } catch (error) {
        console.error('Error fetching categories:', error);
        res.status(500).json({ error: 'Failed to fetch categories' });
    }
});

// GET single category
router.get('/:id', async (req, res) => {
    try {
        const category = await getItem(CATEGORIES_TABLE, { id: req.params.id });
        if (!category) {
            return res.status(404).json({ error: 'Category not found' });
        }
        res.json(category);
    } catch (error) {
        console.error('Error fetching category:', error);
        res.status(500).json({ error: 'Failed to fetch category' });
    }
});

// POST create category
router.post('/', upload.single('image'), async (req, res) => {
    try {
        const { name, description, order } = req.body;

        // Generate slug from name
        const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

        // Upload image if provided
        let imageUrl = '';
        if (req.file) {
            imageUrl = await uploadImage(req.file.buffer, req.file.originalname, req.file.mimetype);
        }

        const category = {
            id: uuidv4(),
            name,
            slug,
            description: description || '',
            image: imageUrl,
            order: parseInt(order) || 0,
            createdAt: new Date().toISOString()
        };

        await putItem(CATEGORIES_TABLE, category);
        res.status(201).json(category);
    } catch (error) {
        console.error('Error creating category:', error);
        res.status(500).json({ error: 'Failed to create category' });
    }
});

// PUT update category
router.put('/:id', upload.single('image'), async (req, res) => {
    try {
        const { name, description, order, existingImage } = req.body;

        const existing = await getItem(CATEGORIES_TABLE, { id: req.params.id });
        if (!existing) {
            return res.status(404).json({ error: 'Category not found' });
        }

        const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

        // Handle image
        let imageUrl = existingImage || existing.image;
        if (req.file) {
            // Delete old image if exists
            if (existing.image) {
                await deleteImage(existing.image);
            }
            imageUrl = await uploadImage(req.file.buffer, req.file.originalname, req.file.mimetype);
        }

        const category = {
            ...existing,
            name,
            slug,
            description: description || '',
            image: imageUrl,
            order: parseInt(order) || existing.order || 0,
            updatedAt: new Date().toISOString()
        };

        await putItem(CATEGORIES_TABLE, category);
        res.json(category);
    } catch (error) {
        console.error('Error updating category:', error);
        res.status(500).json({ error: 'Failed to update category' });
    }
});

// DELETE category
router.delete('/:id', async (req, res) => {
    try {
        const category = await getItem(CATEGORIES_TABLE, { id: req.params.id });
        if (!category) {
            return res.status(404).json({ error: 'Category not found' });
        }

        // Delete image from S3
        if (category.image) {
            await deleteImage(category.image);
        }

        await deleteItem(CATEGORIES_TABLE, { id: req.params.id });
        res.json({ message: 'Category deleted successfully' });
    } catch (error) {
        console.error('Error deleting category:', error);
        res.status(500).json({ error: 'Failed to delete category' });
    }
});

module.exports = router;
