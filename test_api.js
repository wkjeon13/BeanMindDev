require('dotenv').config();
const jwt = require('jsonwebtoken');
const fetch = require('node-fetch');

async function testAnalyze() {
    const JWT_SECRET = process.env.JWT_SECRET || 'fallback_jwt_super_secret_dev_key';
    const token = jwt.sign(
        { id: 1, email: 'test@example.com', role: 'USER' },
        JWT_SECRET,
        { expiresIn: '24h' }
    );
    console.log("Generated Token:", token);

    const analyzeRes = await fetch("http://localhost:3001/api/ai-features/tasting-note/analyze", {
        method: "POST",
        headers: { 
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
            coffeeName: "Ethiopia Yirgacheffe",
            rawNote: "It was sour and sweet."
        })
    });

    const analyzeData = await analyzeRes.json();
    console.log("Analyze Res:", analyzeRes.status, analyzeData);
}

testAnalyze();
