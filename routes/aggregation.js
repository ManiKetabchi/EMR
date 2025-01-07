import express from 'express';
import { ObjectId } from 'mongodb';
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

router.delete('/appointments/:id', async (req, res) => {
  try {
      const db = await connectDB();
      const appointmentId = req.params.id; 
      if (!ObjectId.isValid(appointmentId)) {
        return res.status(400).json({ message: "Invalid appointment ID format" });
      }

      const result = await db.collection('appointments').deleteOne({ _id: new ObjectId(appointmentId) });

    if (result.deletedCount === 0) {
      return res.status(404).json({ message: "Appointment not found" });
    }

    res.status(200).json({ message: "Appointment deleted successfully" });
  } 
  
   catch (error) {
    console.error("Error deleting appointment:", error.message);
    res.status(500).json({ message: "Error deleting appointment", error: error.message });
  }
});

router.get('/patients/aggregated-diagnosis', async (req, res) => {
    try {
        const db = await connectDB();
        const result = await db.collection ('Patients').aggregate([
            {
              $unwind: {
                path: "$medical_history",
              },
            },
            {
              $group: {
                _id: "$medical_history",
                numPatients: {
                  $sum: 1,
                }
              }
            },
            {
              $sort: {
                numPatients: -1
              }
            }
          ]).toArray();
        res.json(result);
    } catch (error) {
        res.status(500).json({ message: "Error finding most common diagnosis", error });
    }
});

router.get('/doctors/appointments-count', async (req, res) => {
  try {

    const db = await connectDB();
    const appointmentsCollection = db.collection('Appointments');

    
    const aggregationPipeline = [
      {
        $group: {
          _id: '$doctor_id', 
          totalAppointments: { $sum: 1 }, 
        },
      }, {
        $addFields: {
          doctor_id: { $toObjectId: '$_id' }, 
        },
      },
      {
        $lookup: {
          from: 'Doctors', 
          localField: 'doctor_id', 
          foreignField: '_id', 
          as: 'doctorDetails', 
        },
      },
      {
        $unwind: '$doctorDetails', 
      },
      {
        $project: {
          _id: 0, 
          doctor_id: '$_id',
          doctorName: {
            $concat: ['$doctorDetails.first_name', ' ', '$doctorDetails.last_name'], 
          },
          specialization: '$doctorDetails.specialization', 
          totalAppointments: 1, 
        },
      },
      {
        $sort: { totalAppointments: -1 },
      },
    ];

    const results = await appointmentsCollection.aggregate(aggregationPipeline).toArray();
    res.status(200).json(results);
  } catch (error) {
    console.error(error);
    res.status(500).send('Error retrieving appointment counts');
  }
});


export default router; 
