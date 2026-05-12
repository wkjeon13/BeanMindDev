import express from 'express';
import { PrismaClient } from '@prisma/client';

const router = express.Router();
const prisma = new PrismaClient();

// Get all hero banners
router.get('/', async (req, res) => {
    try {
        const banners = await prisma.heroBanner.findMany({
            orderBy: { createdAt: 'desc' }
        });
        res.json(banners);
    } catch (error) {
        console.error('Error fetching hero banners:', error);
        res.status(500).json({ error: 'INTERNAL_SERVER_ERROR' });
    }
});

// Create a new hero banner
router.post('/', async (req, res) => {
    try {
        const { title, titleEn, subtitle, subtitleEn, description, descriptionEn, backgroundImage, buttonText, buttonTextEn, buttonLink, textColor, alignment, countryCode, isActive, startDate, endDate } = req.body;
        
        if (!backgroundImage) {
            return res.status(400).json({ error: 'Background image is required' });
        }

        const banner = await prisma.heroBanner.create({
            data: {
                title, titleEn, subtitle, subtitleEn, description, descriptionEn, backgroundImage, buttonText, buttonTextEn, buttonLink, textColor, alignment, countryCode, isActive,
                startDate: startDate ? new Date(startDate) : null,
                endDate: endDate ? new Date(endDate) : null
            }
        });
        res.json(banner);
    } catch (error) {
        console.error('Error creating hero banner:', error);
        res.status(500).json({ error: 'INTERNAL_SERVER_ERROR' });
    }
});

// Update an existing hero banner
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { title, titleEn, subtitle, subtitleEn, description, descriptionEn, backgroundImage, buttonText, buttonTextEn, buttonLink, textColor, alignment, countryCode, isActive, startDate, endDate } = req.body;
        
        const banner = await prisma.heroBanner.update({
            where: { id },
            data: {
                title, titleEn, subtitle, subtitleEn, description, descriptionEn, backgroundImage, buttonText, buttonTextEn, buttonLink, textColor, alignment, countryCode, isActive,
                startDate: startDate ? new Date(startDate) : null,
                endDate: endDate ? new Date(endDate) : null
            }
        });
        res.json(banner);
    } catch (error) {
        console.error('Error updating hero banner:', error);
        res.status(500).json({ error: 'INTERNAL_SERVER_ERROR' });
    }
});

// Delete a hero banner
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await prisma.heroBanner.delete({ where: { id } });
        res.json({ success: true });
    } catch (error) {
        console.error('Error deleting hero banner:', error);
        res.status(500).json({ error: 'INTERNAL_SERVER_ERROR' });
    }
});

export default router;
