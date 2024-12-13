import express from 'express';
import {connectDB} from '../config/db.js';
const router = express.Router();

router.get('/patients', async (req, res) => {
    try {
        const db = await connectDB();
        const result = await db.collection('Patients').aggregate([]).toArray();
        res.json(result);
    } catch (error) {
        res.status(500).json({ message: "Error getting patients", error });
    }
});

router.get('/doctors', async (req, res) => {
    try {
        const db = await connectDB();
        const result = await db.collection('Doctors').aggregate([]).toArray();
        res.json(result);
    } catch (error) {
        res.status(500).json({ message: "Error getting doctors", error });
    }
});

router.post('/appointments', async (req, res) => {
    try {
        const db = await connectDB();
        const result = await db.collection('Appointments').aggregate([]).toArray();
        res.json(result);
    } catch (error) {
        res.status(500).json({ message: "Error getting appointments", error });
    }
});

export default router; 
