import Appointment from '../models/Appointment.js';
import Doctor from '../models/Doctor.js';
import User from '../models/User.js';
import { sendEmail } from '../Utils/mailer.js';

// Create a new appointment
export const createAppointment = async (req, res) => {
  try {
    const {
      doctorId,
      appointmentDate,
      timeSlot,
      patientInfo,
      reason,
      symptoms,
      appointmentType = 'consultation'
    } = req.body;

    // Validate required fields
    if (!doctorId || !appointmentDate || !timeSlot || !patientInfo || !reason) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields'
      });
    }

    // Check if doctor exists
    const doctor = await Doctor.findById(doctorId);
    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: 'Doctor not found'
      });
    }

    // Check if doctor is active
    if (doctor.status !== 'Active') {
      return res.status(400).json({
        success: false,
        message: 'Doctor is not available for appointments'
      });
    }

    // Validate appointment date (should be in the future)
    const appointmentDateTime = new Date(appointmentDate);
    const now = new Date();
    if (appointmentDateTime <= now) {
      return res.status(400).json({
        success: false,
        message: 'Appointment date must be in the future'
      });
    }

    // Check if the time slot is available for the doctor on that day
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const dayOfWeek = dayNames[appointmentDateTime.getDay()];
    const doctorTimeSlot = doctor.timeSlots[dayOfWeek];
    
    if (!doctorTimeSlot || !doctorTimeSlot.available) {
      return res.status(400).json({
        success: false,
        message: 'Doctor is not available on this day'
      });
    }

    // Check if the requested time slot falls within doctor's available hours
    if (timeSlot.start < doctorTimeSlot.start || timeSlot.end > doctorTimeSlot.end) {
      return res.status(400).json({
        success: false,
        message: 'Requested time slot is not within doctor\'s available hours'
      });
    }

    // Check for conflicting appointments
    const conflictingAppointment = await Appointment.findOne({
      doctor: doctorId,
      appointmentDate: appointmentDateTime,
      timeSlot: timeSlot,
      status: { $in: ['pending', 'approved'] }
    });

    if (conflictingAppointment) {
      return res.status(400).json({
        success: false,
        message: 'Time slot is already booked'
      });
    }

    // Create the appointment
    const appointment = new Appointment({
      patient: req.user._id,
      doctor: doctorId,
      appointmentDate: appointmentDateTime,
      timeSlot,
      patientInfo,
      reason,
      symptoms,
      appointmentType,
      consultationFee: doctor.consultationFee
    });

    await appointment.save();

    // Populate the appointment with doctor and patient details
    await appointment.populate([
      { path: 'doctor', select: 'name specialization consultationFee email' },
      { path: 'patient', select: 'firstName lastName email phone' }
    ]);

    // Notify doctor by email (non-blocking)
    try {
      const doctorEmail = doctor.email || appointment.doctor?.email;
      if (doctorEmail) {
        const patientName = `${appointment.patient.firstName} ${appointment.patient.lastName}`.trim();
        const dateStr = new Date(appointment.appointmentDate).toLocaleDateString();
        const timeStr = `${appointment.timeSlot.start} - ${appointment.timeSlot.end}`;
        const html = `
          <div style="font-family:Segoe UI,Tahoma,Arial,sans-serif;font-size:14px;color:#0f172a">
            <h2 style="color:#1e3a8a;margin:0 0 12px">New Appointment Request</h2>
            <p>You have a new appointment request.</p>
            <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:12px;margin:12px 0">
              <p style="margin:0"><strong>Patient:</strong> ${patientName}</p>
              <p style="margin:4px 0 0 0"><strong>Email:</strong> ${appointment.patient.email || ''}</p>
              <p style="margin:4px 0 0 0"><strong>Phone:</strong> ${appointment.patient.phone || ''}</p>
              <p style="margin:8px 0 0 0"><strong>Date:</strong> ${dateStr}</p>
              <p style="margin:4px 0 0 0"><strong>Time:</strong> ${timeStr}</p>
              <p style="margin:8px 0 0 0"><strong>Reason:</strong> ${appointment.reason}</p>
              ${appointment.symptoms ? `<p style="margin:4px 0 0 0"><strong>Symptoms:</strong> ${appointment.symptoms}</p>` : ''}
            </div>
            <p style="color:#64748b">Please review and approve/reject in your dashboard.</p>
          </div>
        `;
        sendEmail({
          to: doctorEmail,
          subject: 'New Appointment Request',
          html,
          text: `New appointment request\nPatient: ${patientName}\nEmail: ${appointment.patient.email || ''}\nPhone: ${appointment.patient.phone || ''}\nDate: ${dateStr}\nTime: ${timeStr}\nReason: ${appointment.reason}${appointment.symptoms ? `\nSymptoms: ${appointment.symptoms}` : ''}`,
        }).then((r) => console.log('Appointment email to doctor queued:', r.success));
      }
    } catch (e) {
      console.error('Error queueing doctor email:', e);
    }

    res.status(201).json({
      success: true,
      message: 'Appointment created successfully',
      data: appointment
    });

  } catch (error) {
    console.error('Error creating appointment:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Get appointments for a specific user
export const getUserAppointments = async (req, res) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;
    const userId = req.user._id;

    // Build query
    const query = { patient: userId };
    if (status) {
      query.status = status;
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Get appointments
    const appointments = await Appointment.find(query)
      .populate('doctor', 'name specialization consultationFee image')
      .sort({ appointmentDate: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    // Get total count
    const totalAppointments = await Appointment.countDocuments(query);

    res.status(200).json({
      success: true,
      message: 'Appointments retrieved successfully',
      data: {
        appointments,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(totalAppointments / parseInt(limit)),
          totalAppointments,
          hasNext: skip + appointments.length < totalAppointments,
          hasPrev: parseInt(page) > 1
        }
      }
    });

  } catch (error) {
    console.error('Error fetching user appointments:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Get appointments for a specific doctor
export const getDoctorAppointments = async (req, res) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;
    const doctorId = req.user._id;

    // Find the doctor profile
    const doctor = await Doctor.findOne({ user: doctorId });
    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: 'Doctor profile not found'
      });
    }

    // Build query
    const query = { doctor: doctor._id };
    if (status) {
      query.status = status;
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Get appointments
    const appointments = await Appointment.find(query)
      .populate('patient', 'firstName lastName email phone')
      .sort({ appointmentDate: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    // Get total count
    const totalAppointments = await Appointment.countDocuments(query);

    res.status(200).json({
      success: true,
      message: 'Doctor appointments retrieved successfully',
      data: {
        appointments,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(totalAppointments / parseInt(limit)),
          totalAppointments,
          hasNext: skip + appointments.length < totalAppointments,
          hasPrev: parseInt(page) > 1
        }
      }
    });

  } catch (error) {
    console.error('Error fetching doctor appointments:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Get appointment by ID
export const getAppointmentById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;
    const userRole = req.user.role;

    const appointment = await Appointment.findById(id)
      .populate('doctor', 'name specialization consultationFee image')
      .populate('patient', 'firstName lastName email phone');

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: 'Appointment not found'
      });
    }

    // Check if user has permission to view this appointment
    if (userRole === 'user' && appointment.patient._id.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    if (userRole === 'doctor') {
      const doctor = await Doctor.findOne({ user: userId });
      if (!doctor || appointment.doctor._id.toString() !== doctor._id.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }
    }

    res.status(200).json({
      success: true,
      message: 'Appointment retrieved successfully',
      data: appointment
    });

  } catch (error) {
    console.error('Error fetching appointment:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Update appointment status (approve/reject)
export const updateAppointmentStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, doctorNotes } = req.body;

    // Validate status
    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status. Must be approved or rejected'
      });
    }

    // Find the appointment
    const appointment = await Appointment.findById(id);
    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: 'Appointment not found'
      });
    }

    // Check if user is the doctor for this appointment
    const doctor = await Doctor.findOne({ user: req.user._id });
    if (!doctor || appointment.doctor.toString() !== doctor._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Only the assigned doctor can update appointment status'
      });
    }

    // Check if appointment can be updated
    if (!['pending'].includes(appointment.status)) {
      return res.status(400).json({
        success: false,
        message: 'Appointment status cannot be changed'
      });
    }

    // Update appointment
    appointment.status = status;
    if (doctorNotes) {
      appointment.doctorNotes = doctorNotes;
    }

    await appointment.save();

    // Populate the appointment
    await appointment.populate([
      { path: 'doctor', select: 'name specialization email' },
      { path: 'patient', select: 'firstName lastName email' }
    ]);

    // Notify patient on approval (non-blocking)
    if (status === 'approved') {
      try {
        const patientEmail = appointment.patient?.email;
        if (patientEmail) {
          const patientName = `${appointment.patient.firstName} ${appointment.patient.lastName}`.trim();
          const dateStr = new Date(appointment.appointmentDate).toLocaleDateString();
          const timeStr = `${appointment.timeSlot.start} - ${appointment.timeSlot.end}`;
          const html = `
            <div style="font-family:Segoe UI,Tahoma,Arial,sans-serif;font-size:14px;color:#0f172a">
              <h2 style=\"color:#1e3a8a;margin:0 0 12px\">Appointment Approved</h2>
              <p>Dear ${patientName},</p>
              <p>Your appointment has been approved.</p>
              <div style=\"background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:12px;margin:12px 0\">
                <p style=\"margin:0\"><strong>Doctor:</strong> ${appointment.doctor?.name || ''} (${appointment.doctor?.specialization || ''})</p>
                <p style=\"margin:8px 0 0 0\"><strong>Date:</strong> ${dateStr}</p>
                <p style=\"margin:4px 0 0 0\"><strong>Time:</strong> ${timeStr}</p>
                ${doctorNotes ? `<p style=\\"margin:8px 0 0 0\\"><strong>Notes:</strong> ${doctorNotes}</p>` : ''}
              </div>
              <p style=\"color:#64748b\">Please arrive 10 minutes early.</p>
            </div>
          `;
          sendEmail({
            to: patientEmail,
            subject: 'Your Appointment Has Been Approved',
            html,
            text: `Appointment approved\nDoctor: ${appointment.doctor?.name || ''} (${appointment.doctor?.specialization || ''})\nDate: ${dateStr}\nTime: ${timeStr}${doctorNotes ? `\nNotes: ${doctorNotes}` : ''}`,
          }).then((r) => console.log('Approval email to patient queued:', r.success));
        }
      } catch (e) {
        console.error('Error queueing approval email to patient:', e);
      }
    }

    res.status(200).json({
      success: true,
      message: `Appointment ${status} successfully`,
      data: appointment
    });

  } catch (error) {
    console.error('Error updating appointment status:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Cancel appointment
export const cancelAppointment = async (req, res) => {
  try {
    const { id } = req.params;
    const { cancellationReason } = req.body;

    const appointment = await Appointment.findById(id);
    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: 'Appointment not found'
      });
    }

    // Check if user has permission to cancel this appointment
    if (appointment.patient.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // Check if appointment can be cancelled
    if (!appointment.canBeCancelled()) {
      return res.status(400).json({
        success: false,
        message: 'Appointment cannot be cancelled at this time'
      });
    }

    // Update appointment
    appointment.status = 'cancelled';
    if (cancellationReason) {
      appointment.cancellationReason = cancellationReason;
    }

    await appointment.save();

    // Populate doctor and patient for email notification
    await appointment.populate([
      { path: 'doctor', select: 'name email' },
      { path: 'patient', select: 'firstName lastName email phone' }
    ]);

    // Notify doctor via email (non-blocking)
    try {
      const doctorEmail = appointment.doctor?.email;
      if (doctorEmail) {
        const patientName = `${appointment.patient.firstName} ${appointment.patient.lastName}`.trim();
        const dateStr = new Date(appointment.appointmentDate).toLocaleDateString();
        const timeStr = `${appointment.timeSlot.start} - ${appointment.timeSlot.end}`;
        const html = `
          <div style="font-family:Segoe UI,Tahoma,Arial,sans-serif;font-size:14px;color:#0f172a">
            <h2 style=\"color:#1e3a8a;margin:0 0 12px\">Appointment Cancelled</h2>
            <p>The following appointment has been cancelled by the patient.</p>
            <div style=\"background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:12px;margin:12px 0\">
              <p style=\"margin:0\"><strong>Patient:</strong> ${patientName}</p>
              <p style=\"margin:4px 0 0 0\"><strong>Email:</strong> ${appointment.patient.email || ''}</p>
              <p style=\"margin:4px 0 0 0\"><strong>Phone:</strong> ${appointment.patient.phone || ''}</p>
              <p style=\"margin:8px 0 0 0\"><strong>Date:</strong> ${dateStr}</p>
              <p style=\"margin:4px 0 0 0\"><strong>Time:</strong> ${timeStr}</p>
              ${appointment.cancellationReason ? `<p style=\\"margin:8px 0 0 0\\"><strong>Reason:</strong> ${appointment.cancellationReason}</p>` : ''}
            </div>
            <p style=\"color:#64748b\">You can view details in your dashboard.</p>
          </div>
        `;
        sendEmail({
          to: doctorEmail,
          subject: 'Appointment Cancelled by Patient',
          html,
          text: `Appointment cancelled by patient\nPatient: ${patientName}\nEmail: ${appointment.patient.email || ''}\nPhone: ${appointment.patient.phone || ''}\nDate: ${dateStr}\nTime: ${timeStr}${appointment.cancellationReason ? `\nReason: ${appointment.cancellationReason}` : ''}`,
        }).then((r) => console.log('Cancellation email to doctor queued:', r.success));
      }
    } catch (e) {
      console.error('Error queueing cancellation email:', e);
    }

    res.status(200).json({
      success: true,
      message: 'Appointment cancelled successfully',
      data: appointment
    });

  } catch (error) {
    console.error('Error cancelling appointment:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Get available time slots for a doctor on a specific date
export const getAvailableTimeSlots = async (req, res) => {
  try {
    const { doctorId, date } = req.params;

    // Validate date
    const appointmentDate = new Date(date);
    if (isNaN(appointmentDate.getTime())) {
      return res.status(400).json({
        success: false,
        message: 'Invalid date format'
      });
    }

    // Check if date is in the future
    const now = new Date();
    if (appointmentDate <= now) {
      return res.status(400).json({
        success: false,
        message: 'Date must be in the future'
      });
    }

    // Get doctor
    const doctor = await Doctor.findById(doctorId);
    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: 'Doctor not found'
      });
    }

    // Get day of week
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const dayOfWeek = dayNames[appointmentDate.getDay()];
    const doctorTimeSlot = doctor.timeSlots[dayOfWeek];


    if (!doctorTimeSlot || !doctorTimeSlot.available) {
      return res.status(200).json({
        success: true,
        message: 'Doctor is not available on this day',
        data: {
          availableSlots: []
        }
      });
    }

    // Get booked appointments for this date
    const startOfDay = new Date(appointmentDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(appointmentDate);
    endOfDay.setHours(23, 59, 59, 999);

    const bookedAppointments = await Appointment.find({
      doctor: doctorId,
      appointmentDate: {
        $gte: startOfDay,
        $lt: endOfDay
      },
      status: { $in: ['pending', 'approved'] }
    }).select('timeSlot');


    // Generate available time slots
    const availableSlots = [];
    const startTime = doctorTimeSlot.start;
    const endTime = doctorTimeSlot.end;
    const slotDuration = 30; // 30 minutes per slot

    // Convert time to minutes for easier calculation
    const timeToMinutes = (time) => {
      const [hours, minutes] = time.split(':').map(Number);
      return hours * 60 + minutes;
    };

    const minutesToTime = (minutes) => {
      const hours = Math.floor(minutes / 60);
      const mins = minutes % 60;
      return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
    };

    const startMinutes = timeToMinutes(startTime);
    const endMinutes = timeToMinutes(endTime);

    for (let minutes = startMinutes; minutes < endMinutes; minutes += slotDuration) {
      const slotStart = minutesToTime(minutes);
      const slotEnd = minutesToTime(minutes + slotDuration);

      // Check if this slot is already booked
      const isBooked = bookedAppointments.some(appointment => 
        appointment.timeSlot.start === slotStart && appointment.timeSlot.end === slotEnd
      );


      if (!isBooked) {
        availableSlots.push({
          start: slotStart,
          end: slotEnd,
          display: `${slotStart} - ${slotEnd}`
        });
      }
    }

    res.status(200).json({
      success: true,
      message: 'Available time slots retrieved successfully',
      data: {
        availableSlots,
        doctor: {
          name: doctor.name,
          specialization: doctor.specialization,
          consultationFee: doctor.consultationFee
        }
      }
    });

  } catch (error) {
    console.error('Error fetching available time slots:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Admin dashboard stats
export const getAdminDashboardStats = async (req, res) => {
  try {
    const [totalUsers, totalDoctors, todayCount, pendingCount] = await Promise.all([
      User.countDocuments({}),
      Doctor.countDocuments({}),
      (async () => {
        const start = new Date();
        start.setHours(0, 0, 0, 0);
        const end = new Date();
        end.setHours(23, 59, 59, 999);
        return Appointment.countDocuments({ appointmentDate: { $gte: start, $lt: end } });
      })(),
      Appointment.countDocuments({ status: 'pending' })
    ]);

    // Last 7 days trend
    const last7Days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setHours(0, 0, 0, 0);
      d.setDate(d.getDate() - i);
      const start = new Date(d);
      const end = new Date(d);
      end.setHours(23, 59, 59, 999);
      // eslint-disable-next-line no-await-in-loop
      const count = await Appointment.countDocuments({ appointmentDate: { $gte: start, $lt: end } });
      last7Days.push({ date: start.toISOString().slice(0, 10), count });
    }

    // Status distribution
    const [approvedCount, rejectedCount, completedCount, cancelledCount] = await Promise.all([
      Appointment.countDocuments({ status: 'approved' }),
      Appointment.countDocuments({ status: 'rejected' }),
      Appointment.countDocuments({ status: 'completed' }),
      Appointment.countDocuments({ status: 'cancelled' }),
    ]);

    res.status(200).json({
      success: true,
      data: {
        totalUsers,
        totalDoctors,
        todayAppointments: todayCount,
        pendingReviews: pendingCount,
        last7Days,
        statusDistribution: {
          pending: pendingCount,
          approved: approvedCount,
          rejected: rejectedCount,
          completed: completedCount,
          cancelled: cancelledCount,
        }
      }
    });
  } catch (error) {
    console.error('Error fetching admin stats:', error);
    res.status(500).json({ success: false, message: 'Internal server error', error: error.message });
  }
};
