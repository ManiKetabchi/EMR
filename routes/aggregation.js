const express = require('express');
const { connectDB } = require('../config/db');
const router = express.Router();

router.get('/patients', async (req, res) => {
    try {
        const db = await connectDB();
        const result = await db.collection('patients').aggregate([]).toArray();
        res.json(result);
    } catch (error) {
        res.status(500).json({ message: "Error getting patients", error });
    }
});

module.exports = router;
