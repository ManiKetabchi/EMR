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

    res.json({ message: `Appointment status updated to: ${status}` });
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
router.get('/doctors/:id/patients', async (req, res) => {
  try {
    const db = await connectDB();
    const doctorId = req.params.id;
        if (!ObjectId.isValid(doctorId)) {
            return res.status(400).json({ message: "invalid doctorId" })
        }
    const result = await db.collection('Appointments').aggregate([
      {
        $match: {
          doctor_id: new ObjectId(doctorId)
        }
      },
      {
        $lookup: {
          from: "Patients",
          localField: "patient_id",
          foreignField: "_id",
          as: "patient_info"
        }
      },
      {
        $lookup: {
          from: "Doctors",
          localField: "doctor_id",
          foreignField: "_id",
          as: "doctor_info"
        }
      },
      {
        $project: {
          _id: 0,
          doctor: '$doctor_info.first_name',
          patients: '$patient_info.first_name'
        }
      }
    ]).toArray();
    res.json(result);
  } catch (error) {
    res.status(500).json({ message: "Error retrieving patients treated by specific doctor"})
  }
});

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
router.get('/patients/prescribed-meds', async (req, res) => { 
  try {


    const db = await connectDB();
    const patientId = req.query.patientId;
    const prescriptionsCollection = db.collection('Prescriptions');


    if (!ObjectId.isValid(patientId)) {
      return res.status(400).json({ message:'Invalid patient ID'});
    }

    const aggregationPipeline = [
      {
        $match: { patient_id: new ObjectId(patientId) },
      },
      {
        $lookup: {
          from: 'Prescriptions',
          localField: 'patient_id',
          foreignField: 'patient_id',
          as: 'prescriptionDetails',
        },
      },
      {
        $unwind: '$prescriptionDetails',
      },
      {
        $project: {
          _id: 0,
          patient_id: '$_id',
          medication: '$prescriptionDetails.medication_name',
          dosage: '$prescriptionDetails.dosage',
          duration: '$prescriptionDetails.duration',
          prescribedDate: '$prescriptionDetails.date_prescribed',
        },
      },
    ];

    const result = await prescriptionsCollection.aggregate(aggregationPipeline).toArray();

    res.status(200).json(result);

  } catch (error) {
    console.error("Error retrieving prescribed medications:", error);
    res.status(500).json({ message: "Error retrieving prescribed medications", error });
  }
});

//first join
router.get('/appointments/:id/details', async (req, res) => { 
    try {
        const db = await connectDB()
        const apptid = req.params.id
        if (!ObjectId.isValid(apptid)) {
            return res.status(400).json({ message: "id format is wrong" })
        }
        const apptdetails = await db.collection('Appointments').aggregate([
            {
                $match: { _id: new ObjectId(apptid) }
            },
            {
                $lookup: {
                    from: 'Patients',
                    localField: 'patient_id', 
                    foreignField: '_id',
                    as: 'patientDetails'
                }
            },
            {
                $lookup: {
                    from: 'Doctors',
                    localField: 'doctor_id',
                    foreignField: '_id', 
                    as: 'doctorDetails'
                }
            },
            {
                $project: {
                    _id: 1,
                    appointment_date: 1,
                    reason: 1,
                    status: 1,
                    notes: 1,
                    patientDetails: { $arrayElemAt: ['$patientDetails', 0] },
                    doctorDetails: { $arrayElemAt: ['$doctorDetails', 0] }
                }
            }
        ]).toArray()
        if (apptdetails.length === 0) {
            return res.status(404).json({ message: "appt not found or doesnt exist" });
        }
        res.status(200).json(apptdetails[0])
    } catch (error) {
        console.error("error fetching appt details:", error);
        res.status(500).json({ message: "error fetching appt details", error })
    }
})

export default router; 