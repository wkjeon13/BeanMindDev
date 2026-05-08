const fs = require('fs');
const content = fs.readFileSync('server/routes/users.ts', 'utf8');
const lines = content.split(/\r?\n/);
lines.splice(25, 24, `// GET: Fetch user's saved prescriptions
router.get('/prescriptions', authenticateToken, async (req: any, res: any) => {
    try {
        const userId = req.user.id;
        const prescriptions = await prisma.prescription.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' }
        });
        res.status(200).json(prescriptions);
    } catch (error) {
        console.error("Fetch prescriptions error:", error);
        res.status(500).json({ error: 'Internal server error.' });
    }
});

// POST: Save a new AI prescription
router.post('/prescriptions', authenticateToken, async (req: any, res: any) => {
    try {
        const userId = req.user.id;
        const { title, beanName, brand, aiComment, usePoints } = req.body;

        if (!beanName || !brand || !aiComment) {
            return res.status(400).json({ error: 'Missing required prescription fields.' });
        }
        
        let prescriptionCost = 100;
        try {
            const policy = await prisma.pointPolicy.findUnique({ where: { id: 'singleton' } });
            if (policy) prescriptionCost = policy.prescriptionCost;
        } catch(e) {}

        const userDb = await prisma.user.findUnique({ where: { id: userId } });
        if (!userDb) return res.status(404).json({ error: 'User not found' });
        
        // Check for free prescriptions or deduct points
        if (userDb.freePrescriptions > 0) {
             await prisma.user.update({ where: { id: userId }, data: { freePrescriptions: { decrement: 1 } } });
        } else {
             if (usePoints) {
                 if (userDb.points < prescriptionCost) return res.status(400).json({ error: 'Not enough beans.' });
                 await prisma.user.update({ where: { id: userId }, data: { points: { decrement: prescriptionCost } } });
                 await prisma.pointHistory.create({ data: { userId, amount: -prescriptionCost, type: 'USE', description: 'AI 커피 처방전 발급' }});
             }
        }

        const newPrescription = await prisma.prescription.create({
            data: {
                userId,
                title,
                beanName,
                brand,
                aiComment
            }
        });
        res.status(201).json({ message: 'Prescription saved successfully!', prescription: newPrescription });
    } catch (error) {
        console.error("Save prescription error:", error);
        res.status(500).json({ error: 'Internal server error while saving prescription.' });
    }
});

// PUT: Update prescription title
router.put('/prescriptions/:id', authenticateToken, async (req: any, res: any) => {
    try {
        const userId = req.user.id;
        const { id } = req.params;
        const { title } = req.body;

        const prescription = await prisma.prescription.findUnique({ where: { id } });
        if (!prescription) return res.status(404).json({ error: 'Prescription not found.' });
        if (prescription.userId !== userId) return res.status(403).json({ error: 'Unauthorized.' });

        const updated = await prisma.prescription.update({
            where: { id },
            data: { title }
        });
        res.status(200).json(updated);
    } catch (error) {
        console.error("Update prescription error:", error);
        res.status(500).json({ error: 'Internal server error.' });
    }
});`);
fs.writeFileSync('server/routes/users.ts', lines.join('\n'));
console.log('File successfully patched!');
