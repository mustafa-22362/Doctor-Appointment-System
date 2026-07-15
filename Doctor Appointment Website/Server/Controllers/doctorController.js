import Doctor from '../models/Doctor.js';
import User from '../models/User.js';
import { generateToken } from '../Middleware/auth.js';
import { sendEmail } from '../Utils/mailer.js';

// Register a new doctor (Admin only)
export const registerDoctor = async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      email,
      phone,
      password,
      specialization,
      experience,
      licenseNumber,
      qualifications,
      bio,
      consultationFee,
      timeSlots
    } = req.body;

    // Parse JSON fields if they are strings (from FormData)
    let parsedQualifications = qualifications || [];
    if (typeof qualifications === 'string') {
      try {
        parsedQualifications = JSON.parse(qualifications);
      } catch (error) {
        console.error('Error parsing qualifications:', error);
        parsedQualifications = [];
      }
    }
    
    let parsedTimeSlots = timeSlots || {};
    if (typeof timeSlots === 'string') {
      try {
        parsedTimeSlots = JSON.parse(timeSlots);
      } catch (error) {
        console.error('Error parsing timeSlots:', error);
        parsedTimeSlots = {};
      }
    }

    // Check if user with this email already exists
    const existingUser = await User.findByEmail(email);
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User with this email already exists'
      });
    }

    // Check if doctor with this license already exists
    const existingDoctor = await Doctor.findOne({ licenseNumber });
    if (existingDoctor) {
      return res.status(400).json({
        success: false,
        message: 'Doctor with this license number already exists'
      });
    }

    // Create user account for doctor
    const user = new User({
      firstName,
      lastName,
      email,
      phone,
      password,
      role: 'doctor'
    });

    await user.save();

    // Create doctor profile
    const doctor = new Doctor({
      user: user._id,
      name: `${firstName} ${lastName}`,
      email,
      phone,
      specialization,
      experience,
      licenseNumber,
      qualifications: parsedQualifications,
      bio,
      consultationFee: consultationFee || 2500,
      timeSlots: parsedTimeSlots,
      image: req.file ? req.file.filename : null
    });

    await doctor.save();

    // Generate token
    const token = generateToken(user._id);

    // Send credentials email (non-blocking)
    const plainPassword = password; // from req.body
    if (email && plainPassword) {
      const mailHtml = `
        <div style="font-family:Segoe UI,Tahoma,Arial,sans-serif;font-size:14px;color:#0f172a">
          <h2 style="color:#1e3a8a;margin:0 0 12px">Welcome to Health Ways Hospital</h2>
          <p>Dear Dr. ${firstName} ${lastName},</p>
          <p>Your doctor account has been created. Use the following credentials to sign in:</p>
          <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:12px;margin:12px 0">
            <p style="margin:0"><strong>Email:</strong> ${email}</p>
            <p style="margin:4px 0 0 0"><strong>Password:</strong> ${plainPassword}</p>
          </div>
          <p><a href="http://localhost:3000/login" style="color:#1e3a8a;text-decoration:none">Login to your account</a></p>
          <p style="color:#64748b">If you did not request this, please ignore this email.</p>
        </div>
      `;
      sendEmail({
        to: email,
        subject: 'Your Doctor Account Credentials',
        html: mailHtml,
        text: `Welcome to Health Ways Hospital\nEmail: ${email}\nPassword: ${plainPassword}\nLogin: http://localhost:3000/login`,
      }).then((r) => console.log('Doctor credentials email queued:', r.success));
    }

    res.status(201).json({
      success: true,
      message: 'Doctor registered successfully',
      data: {
        user: user.getPublicProfile(),
        doctor: doctor,
        token
      }
    });

  } catch (error) {
    console.error('Error registering doctor:', error);
    
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors
      });
    }

    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Doctor with this email or license already exists'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Get doctor profile (Doctor only)
export const getDoctorProfile = async (req, res) => {
  try {
    const doctor = await Doctor.findOne({ user: req.user._id })
      .populate('user', 'firstName lastName email phone role');

    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: 'Doctor profile not found'
      });
    }

    res.status(200).json({
      success: true,
      data: {
        doctor
      }
    });

  } catch (error) {
    console.error('Error fetching doctor profile:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Update doctor profile (Doctor only)
export const updateDoctorProfile = async (req, res) => {
  try {
    const {
      name,
      phone,
      specialization,
      experience,
      bio,
      consultationFee,
      timeSlots,
      qualifications
    } = req.body;

    const updateData = {};
    if (name) updateData.name = name;
    if (phone) updateData.phone = phone;
    if (specialization) updateData.specialization = specialization;
    if (experience !== undefined) updateData.experience = experience;
    if (bio) updateData.bio = bio;
    if (consultationFee !== undefined) updateData.consultationFee = consultationFee;
    if (timeSlots) {
      let parsedTimeSlots = timeSlots;
      if (typeof timeSlots === 'string') {
        try {
          parsedTimeSlots = JSON.parse(timeSlots);
        } catch (e) {
          parsedTimeSlots = undefined;
        }
      }
      if (parsedTimeSlots) updateData.timeSlots = parsedTimeSlots;
    }
    if (qualifications) {
      let parsedQualifications = qualifications;
      if (typeof qualifications === 'string') {
        try {
          parsedQualifications = JSON.parse(qualifications);
        } catch (e) {
          // fallback comma separated
          parsedQualifications = qualifications
            .split(',')
            .map(s => s.trim())
            .filter(Boolean);
        }
      }
      updateData.qualifications = parsedQualifications;
    }

    const doctor = await Doctor.findOneAndUpdate(
      { user: req.user._id },
      updateData,
      { new: true, runValidators: true }
    ).populate('user', 'firstName lastName email phone role');

    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: 'Doctor profile not found'
      });
    }

    // Optionally sync certain fields to linked user record
    if (phone) {
      await User.findByIdAndUpdate(doctor.user._id, { phone }, { new: true });
    }
    if (name) {
      const [firstName, ...rest] = String(name).trim().split(' ');
      const lastName = rest.join(' ');
      await User.findByIdAndUpdate(
        doctor.user._id,
        { firstName: firstName || undefined, lastName: lastName || undefined },
        { new: true }
      );
    }

    res.status(200).json({
      success: true,
      message: 'Doctor profile updated successfully',
      data: {
        doctor
      }
    });

  } catch (error) {
    console.error('Error updating doctor profile:', error);
    
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors
      });
    }

    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Update doctor time slots (Doctor only)
export const updateDoctorTimeSlots = async (req, res) => {
  try {
    const { timeSlots } = req.body;

    if (!timeSlots) {
      return res.status(400).json({
        success: false,
        message: 'Time slots data is required'
      });
    }

    // Validate time slots format
    const validDays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    for (const day of validDays) {
      if (timeSlots[day] && timeSlots[day].available) {
        if (!timeSlots[day].start || !timeSlots[day].end) {
          return res.status(400).json({
            success: false,
            message: `Start and end times are required for ${day} when available is true`
          });
        }
      }
    }

    const doctor = await Doctor.findOneAndUpdate(
      { user: req.user._id },
      { timeSlots },
      { new: true, runValidators: true }
    ).populate('user', 'firstName lastName email phone role');

    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: 'Doctor profile not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Time slots updated successfully',
      data: {
        doctor
      }
    });

  } catch (error) {
    console.error('Error updating doctor time slots:', error);
    
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors
      });
    }

    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Get all doctors
export const getAllDoctors = async (req, res) => {
  try {
    const doctors = await Doctor.find({})
      .select('-__v')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      message: 'Doctors retrieved successfully',
      count: doctors.length,
      data: doctors
    });

  } catch (error) {
    console.error('Error fetching doctors:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Get doctor by ID
export const getDoctorById = async (req, res) => {
  try {
    const { id } = req.params;

    const doctor = await Doctor.findById(id).select('-__v');

    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: 'Doctor not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Doctor retrieved successfully',
      data: doctor
    });

  } catch (error) {
    console.error('Error fetching doctor:', error);
    
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        message: 'Invalid doctor ID'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Update doctor status
export const updateDoctorStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['Active', 'Inactive', 'Suspended'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status. Must be Active, Inactive, or Suspended'
      });
    }

    const doctor = await Doctor.findByIdAndUpdate(
      id,
      { status },
      { new: true, runValidators: true }
    ).select('-__v');

    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: 'Doctor not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Doctor status updated successfully',
      data: doctor
    });

  } catch (error) {
    console.error('Error updating doctor status:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Update doctor profile (Admin only)
export const updateDoctorProfileAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // Remove fields that shouldn't be updated directly
    delete updateData._id;
    delete updateData.user;
    delete updateData.createdAt;
    delete updateData.updatedAt;

    // Parse JSON fields if they are strings (from FormData)
    if (updateData.qualifications && typeof updateData.qualifications === 'string') {
      try {
        updateData.qualifications = JSON.parse(updateData.qualifications);
      } catch (error) {
        console.error('Error parsing qualifications:', error);
        updateData.qualifications = [];
      }
    }
    
    if (updateData.timeSlots && typeof updateData.timeSlots === 'string') {
      try {
        updateData.timeSlots = JSON.parse(updateData.timeSlots);
      } catch (error) {
        console.error('Error parsing timeSlots:', error);
        updateData.timeSlots = {};
      }
    }

    // Handle image upload
    if (req.file) {
      updateData.image = req.file.filename;
    }

    const doctor = await Doctor.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    ).select('-__v');

    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: 'Doctor not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Doctor profile updated successfully',
      data: doctor
    });

  } catch (error) {
    console.error('Error updating doctor profile:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Delete doctor
export const deleteDoctor = async (req, res) => {
  try {
    const { id } = req.params;

    const doctor = await Doctor.findByIdAndDelete(id);

    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: 'Doctor not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Doctor deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting doctor:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Get doctors by specialization
export const getDoctorsBySpecialization = async (req, res) => {
  try {
    const { specialization } = req.params;

    const doctors = await Doctor.find({ 
      specialization: specialization,
      status: 'Active' 
    })
    .select('-__v')
    .sort({ rating: -1, createdAt: -1 });

    res.status(200).json({
      success: true,
      message: `Doctors in ${specialization} retrieved successfully`,
      count: doctors.length,
      data: doctors
    });

  } catch (error) {
    console.error('Error fetching doctors by specialization:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};
