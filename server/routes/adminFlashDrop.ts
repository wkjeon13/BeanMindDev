import express from 'express';
import { PrismaClient } from '@prisma/client';

const router = express.Router();
const prisma = new PrismaClient();

// Get all flash drops
router.get('/', async (req, res) => {
    try {
        const flashDrops = await prisma.flashDrop.findMany({
            orderBy: { createdAt: 'desc' }
        });
        res.json(flashDrops);
    } catch (error) {
        console.error('Error fetching flash drops:', error);
        res.status(500).json({ error: 'INTERNAL_SERVER_ERROR' });
    }
});

// Create a new flash drop
router.post('/', async (req, res) => {
    try {
        const { title, titleEn, description, descriptionEn, imageUrl, linkUrl, region, startTime, endTime, maxQuantity, status } = req.body;
        
        if (!imageUrl) {
            return res.status(400).json({ error: 'Image is required' });
        }
        if (!startTime || !endTime) {
            return res.status(400).json({ error: 'Start and end times are required' });
        }

        const drop = await prisma.flashDrop.create({
            data: {
                title,
                titleEn,
                description,
                descriptionEn,
                imageUrl,
                linkUrl,
                region: region || 'GLOBAL',
                startTime: new Date(startTime),
                endTime: new Date(endTime),
                maxQuantity: parseInt(maxQuantity) || 0,
                status: status || 'ACTIVE'
            }
        });
        res.json(drop);
    } catch (error) {
        console.error('Error creating flash drop:', error);
        res.status(500).json({ error: 'INTERNAL_SERVER_ERROR' });
    }
});

// Update an existing flash drop
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { title, titleEn, description, descriptionEn, imageUrl, linkUrl, region, startTime, endTime, maxQuantity, status } = req.body;
        
        const drop = await prisma.flashDrop.update({
            where: { id },
            data: {
                title,
                titleEn,
                description,
                descriptionEn,
                imageUrl,
                linkUrl,
                region,
                startTime: startTime ? new Date(startTime) : undefined,
                endTime: endTime ? new Date(endTime) : undefined,
                maxQuantity: maxQuantity !== undefined ? parseInt(maxQuantity) : undefined,
                status
            }
        });
        res.json(drop);
    } catch (error) {
        console.error('Error updating flash drop:', error);
        res.status(500).json({ error: 'INTERNAL_SERVER_ERROR' });
    }
});

// Delete a flash drop
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await prisma.flashDrop.delete({ where: { id } });
        res.json({ success: true });
    } catch (error) {
        console.error('Error deleting flash drop:', error);
        res.status(500).json({ error: 'INTERNAL_SERVER_ERROR' });
    }
});

export default router;
