import express from 'express';
import { ObjectId } from 'mongodb';
import {connectDB} from '../config/db.js';
const router = express.Router();

// Get a list of all patients
router.get('/patients', async (req, res) => {
    try {
        const db = await connectDB();
        const result = await db.collection('Patients').aggregate([]).toArray();
        res.send(result);
    } catch (error) {
        res.status(500).json({ message: "Error getting patients", error });
    }
});

// Get a list of all doctors
router.get('/doctors', async (req, res) => {
    try {
        const db = await connectDB();
        const result = await db.collection('Doctors').aggregate([]).toArray();
        res.json(result);
    } catch (error) {
        res.status(500).json({ message: "Error getting doctors", error });
    }
});

// Create a new appointment for a patient with a doctor
router.post('/appointments', async (req, res) => {
    try {
        const db = await connectDB();
        const patient = await db.collection('Patients').aggregate([]).toArray();
        const doctor = await db.collection('Doctors').aggregate([]).toArray();
        const appointment = {
          patient_id: patient.find(x => x.first_name === req.body.patient_firstname)._id,
          doctor_id: doctor.find(x => x.first_name === req.body.doctor_firstname)._id,
          appointment_date: new Date(),
          reason: req.body.reason,
          status: "Scheduled",
          notes: req.body.notes
        };
        const result = await db.collection('Appointments').insertOne(appointment);
        res.status(201).json({ message: "Appointment created", _id: result.insertedId });
    } catch (error) {
        res.status(500).json({ message: "Error posting appointments", error });
    }
});

// Update the status of an appointment
router.put('/appointments/:id', async (req, res) => {
  try {
    const db = await connectDB(); // Connect db
    const appointmentId = req.params.id; // Extract id ting
    const { status } = req.body; // Extract status ting

    if (!status) {
        return res.status(400).json({ message: "Status is required" });
    }

    if (status !== "Completed" && status !== "Scheduled") {
        return res.status(400).json({ message: "Invalid status. Allowed statuses are 'Scheduled' and 'Completed'." });
    }

    const result = await db.collection('Appointments').updateOne(
        { _id: new ObjectId(appointmentId) },
        {
            $set: { status, updated_at: new Date() }
        }
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

// Delete or cancel an appointment
router.delete('/appointments/:id', async (req, res) => {
  try {
      const db = await connectDB();
      const appointmentId = req.params.id; 
      if (!ObjectId.isValid(appointmentId)) {
        return res.status(400).json({ message: "Invalid appointment ID format" });
      }

      const result = await db.collection('Appointments').deleteOne({ _id: new ObjectId(appointmentId) });

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

// Retrieve information about a specific appointment
router.get('/appointments/:id', async (req, res) => {
    try {
        const db = await connectDB();
        const appointmentId = req.params.id; 

        if (!ObjectId.isValid(appointmentId)) {
            return res.status(400).json({ message: "Invalid appointment ID format" });
        }

        const appointment = await db.collection('Appointments').findOne({
            _id: new ObjectId(appointmentId)
        });

        if (!appointment) {
            return res.status(404).json({ message: "Appointment not found" });
        }

        res.json(appointment);
    } catch (error) {
        console.error("Error retrieving appointment:", error);
        res.status(500).json({ message: "Error retrieving appointment", error });
    }
});

// Retrieve all patients treated by a specific doctor


// List of most common diagnoses across all patients
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

// Find the number of appointments each doctor has had 
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

// Retrieve a list of all prescribed medications for a specific patient
router.get('/patients/prescribed-meds',async(req,res)=>{
  try {
    const patientId=req.query.patientId;
    const aggregationPipeline=[
      {
        $match:{patient_id: patientId},
      },
      {
        $lookup:{
          from:'prescriptions',
          localField:'_id',
          foreignField:'patient_id',
          as:'prescriptionsDetails',
        },
      },
      {
        $unwind:'$prescriptionsDetails',
      },
      {
        $project:{
          _id:0,
          patient_id:'$_id',
          medication:'$prescriptionsDetails.medication_name',
          dosage:'$prescriptionsDetails.dosage',
          duration:'$prescriptionsDetails.duration',
          prescribedDate:'$prescriptionsDetails.date_perscribed',
        },
      },
    ];

    const results = await patientsCollection.aggregate(aggregationPipeline).toArray();
    res.status(200).json(results);
  } catch (error) {
    console.error(error);
    res.status(500).send('Error retrieving prescribed medications');
  }
});

export default router; 
