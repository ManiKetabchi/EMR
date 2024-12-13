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

router.get('/doctors', async (req, res) => {
    try {
        const db = await connectDB();
        const result = await db.collection('doctors').aggregate([]).toArray();
        res.json(result);
    } catch (error) {
        res.status(500).json({ message: "Error getting doctors", error });
    }
});

router.post('/appointments', async (req, res) => {
    try {
        const db = await connectDB();
        const result = await db.collection('appointments').aggregate([]).toArray();
        res.json(result);
    } catch (error) {
        res.status(500).json({ message: "Error getting appointments", error });
    }
});

router.put('/appointments/:id', async (req, res) => {
    try {
        const db = await connectDB(); 
        const appointmentId = req.params.id; 
        const { status } = req.body; 

        
        if (!status) {
            return res.status(400).json({ message: "Status is required" });
        }

        
        const result = await db.collection('appointments').updateOne(
            { _id: new require('mongodb').ObjectId(appointmentId) }, 
            { $set: { status: status, updated_at: new Date() } } 
        );

       
        if (result.matchedCount === 0) {
            return res.status(404).json({ message: "Appointment not found" });
        }

        res.json({ message: "Appointment status updated successfully" });
    } catch (error) {
        console.error("Error updating appointment status:", error);
        res.status(500).json({ message: "Error updating appointment", error });
    }
});

router.get('/doctors/appointments-count', async (req, res) => {
  try {
    const appointmentsCollection = db.collection('Appointments');

    
    const aggregationPipeline = [
      {
        $group: {
          _id: '$doctor_id', 
          totalAppointments: { $count: {} }, 
        },
      },
      {
        $sort: { totalAppointments: -1 }, 
      },
    ];

    const results = await appointmentsCollection.aggregate(aggregationPipeline).toArray();
    res.json(results);
  } catch (error) {
    console.error(error);
    res.status(500).send('Error retrieving appointment counts');
  }
});


module.exports = router;
