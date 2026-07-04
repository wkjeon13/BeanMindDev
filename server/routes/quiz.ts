import express from 'express';
import jwt from 'jsonwebtoken';
import prisma from '../utils/prisma.js';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret';
const router = express.Router();

// JWT Authentication Middleware
const authenticateToken = (req: any, res: any, next: any) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token || token === 'null') return res.status(401).json({ error: 'Access denied.' });

    jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
        if (err) return res.status(403).json({ error: 'Invalid token.' });
        req.user = user;
        next();
    });
};

const optionalAuth = (req: any, res: any, next: any) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token || token === 'null') return next();

    jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
        if (!err) req.user = user;
        next();
    });
};

// Normalizes a date to YYYY-MM-DD start (00:00:00)
const getTodayRange = () => {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date(start.getTime() + 24 * 60 * 60 * 1000 - 1);
    return { start, end };
};

// GET: /api/quiz/today
router.get('/today', optionalAuth, async (req: any, res: any) => {
    try {
        const { start, end } = getTodayRange();
        
        // Find quiz set for today
        const quizSet = await prisma.coffeeQuizSet.findFirst({
            where: {
                isActive: true,
                scheduledDate: {
                    gte: start,
                    lte: end
                }
            },
            include: {
                questions: {
                    orderBy: { id: 'asc' }
                }
            }
        });

        if (!quizSet) {
            return res.json({ hasQuiz: false });
        }

        let hasAttempted = false;
        let attemptData = null;

        if (req.user?.id) {
            const attempt = await prisma.userQuizAttempt.findFirst({
                where: {
                    userId: req.user.id,
                    setId: quizSet.id
                }
            });
            if (attempt) {
                hasAttempted = true;
                attemptData = attempt;
            }
        }

        // Strip correct answer and explanation to prevent client-side cheating
        const safeQuestions = quizSet.questions.map(q => ({
            id: q.id,
            questionText: q.questionText,
            option1: q.option1,
            option2: q.option2,
            option3: q.option3,
            option4: q.option4,
            beansReward: q.beansReward
        }));

        res.json({
            hasQuiz: true,
            hasAttempted,
            attempt: attemptData,
            quizSet: {
                id: quizSet.id,
                title: quizSet.title,
                themeRegion: quizSet.themeRegion,
                questions: safeQuestions
            }
        });

    } catch (error) {
        console.error('Fetch today quiz error:', error);
        res.status(500).json({ error: 'Failed to load today quiz.' });
    }
});

// POST: /api/quiz/submit
router.post('/submit', authenticateToken, async (req: any, res: any) => {
    try {
        const userId = req.user.id;
        const { setId, answers, wagerDouble } = req.body;

        if (!setId || !Array.isArray(answers)) {
            return res.status(400).json({ error: 'Invalid submission payload.' });
        }

        // 1. Fetch original quiz set
        const quizSet = await prisma.coffeeQuizSet.findUnique({
            where: { id: setId },
            include: { questions: { orderBy: { id: 'asc' } } }
        });

        if (!quizSet || !quizSet.isActive) {
            return res.status(404).json({ error: 'Quiz set not found or inactive.' });
        }

        // Check if already attempted today
        const existingAttempt = await prisma.userQuizAttempt.findUnique({
            where: {
                userId_setId: { userId, setId }
            }
        });

        if (existingAttempt) {
            return res.status(400).json({ error: 'You have already submitted answers for this quiz set.' });
        }

        // 2. Score check
        let correctCount = 0;
        let baseBeans = 0;
        const gradingDetails: any[] = [];
        const isFifthCorrect = false;

        quizSet.questions.forEach((q, idx) => {
            const userAnswer = answers.find(a => a.questionId === q.id);
            const chosen = userAnswer ? userAnswer.chosenOption : null;
            const isCorrect = chosen === q.correctAnswer;

            if (isCorrect) {
                correctCount++;
                baseBeans += q.beansReward;
            }

            gradingDetails.push({
                questionId: q.id,
                questionText: q.questionText,
                chosenOption: chosen,
                correctAnswer: q.correctAnswer,
                isCorrect,
                explanation: q.explanation
            });
        });

        // 3. Double or Nothing Calculation (Fifth question is the wager)
        let finalBeans = baseBeans;
        let isSuccess = false;

        const fifthGrading = gradingDetails[4]; // 5th question
        const doubleAttempted = !!wagerDouble && gradingDetails.length >= 5;

        if (doubleAttempted) {
            if (fifthGrading && fifthGrading.isCorrect) {
                // Double the total reward
                finalBeans = baseBeans * 2;
                isSuccess = true;
            } else {
                // Lose all accumulated reward for today
                finalBeans = 0;
                isSuccess = false;
            }
        }

        // 4. Save attempt and update points inside database transaction
        await prisma.$transaction(async (tx) => {
            // Create attempt record
            await tx.userQuizAttempt.create({
                data: {
                    userId,
                    setId,
                    correctCount,
                    earnedBeans: finalBeans,
                    doubleOrNothing: doubleAttempted,
                    isSuccess
                }
            });

            // Update user balance if points won
            if (finalBeans > 0) {
                await tx.user.update({
                    where: { id: userId },
                    data: { pointBalance: { increment: finalBeans } }
                });

                // Point transaction log
                await tx.pointTransaction.create({
                    data: {
                        userId,
                        amount: finalBeans,
                        type: 'EARN',
                        description: `World Coffee Quiz: ${quizSet.title}` + (doubleAttempted && isSuccess ? ' (Wager Success!)' : '')
                    }
                });
            }

            // Update Expedition Stamp Count if theme region is not GLOBAL and user got at least 1 correct answer
            if (quizSet.themeRegion !== 'GLOBAL' && correctCount > 0) {
                const expedition = await tx.userQuizExpedition.findUnique({
                    where: {
                        userId_regionKey: {
                            userId,
                            regionKey: quizSet.themeRegion
                        }
                    }
                });

                if (expedition) {
                    const newCount = expedition.stampCount + 1;
                    const unlocked = newCount >= 7; // Unlocks at 7 stamps
                    await tx.userQuizExpedition.update({
                        where: { id: expedition.id },
                        data: {
                            stampCount: newCount,
                            isUnlocked: unlocked
                        }
                    });
                } else {
                    await tx.userQuizExpedition.create({
                        data: {
                            userId,
                            regionKey: quizSet.themeRegion,
                            stampCount: 1,
                            isUnlocked: false
                        }
                    });
                }
            }
        });

        res.json({
            message: 'Quiz submitted successfully.',
            correctCount,
            earnedBeans: finalBeans,
            doubleAttempted,
            isSuccess,
            details: gradingDetails
        });

    } catch (error: any) {
        console.error('Quiz submission error:', error);
        res.status(500).json({ error: 'Failed to process quiz submission.', details: error.message });
    }
});

export default router;
