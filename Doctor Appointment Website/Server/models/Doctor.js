import mongoose from 'mongoose';

const timeSlotSchema = new mongoose.Schema({
  start: {
    type: String,
    required: function() {
      return this.available === true;
    },
    default: ''
  },
  end: {
    type: String,
    required: function() {
      return this.available === true;
    },
    default: ''
  },
  available: {
    type: Boolean,
    default: false
  }
});

const doctorSchema = new mongoose.Schema({
  // Link to User model for authentication
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  name: {
    type: String,
    required: [true, 'Doctor name is required'],
    trim: true,
    minlength: [2, 'Name must be at least 2 characters long']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  phone: {
    type: String,
    required: [true, 'Phone number is required'],
    trim: true,
    match: [/^[\+]?[1-9][\d]{0,15}$/, 'Please enter a valid phone number']
  },
  specialization: {
    type: String,
    required: [true, 'Specialization is required'],
    enum: [
      'Cardiology',
      'Neurology', 
      'Pediatrics',
      'Dermatology',
      'Orthopedics',
      'Gynecology',
      'Psychiatry',
      'Ophthalmology',
      'ENT',
      'General Medicine'
    ]
  },
  experience: {
    type: Number,
    required: [true, 'Experience is required'],
    min: [0, 'Experience cannot be negative'],
    max: [50, 'Experience cannot exceed 50 years']
  },
  image: {
    type: String,
    default: null
  },
  timeSlots: {
    monday: timeSlotSchema,
    tuesday: timeSlotSchema,
    wednesday: timeSlotSchema,
    thursday: timeSlotSchema,
    friday: timeSlotSchema,
    saturday: timeSlotSchema,
    sunday: timeSlotSchema
  },
  status: {
    type: String,
    enum: ['Active', 'Inactive', 'Suspended'],
    default: 'Active'
  },
  rating: {
    type: Number,
    default: 0,
    min: 0,
    max: 5
  },
  totalAppointments: {
    type: Number,
    default: 0
  },
  // Additional doctor-specific fields
  licenseNumber: {
    type: String,
    required: [true, 'Medical license number is required'],
    unique: true,
    trim: true
  },
  qualifications: {
    type: [String],
    default: []
  },
  bio: {
    type: String,
    maxlength: [1000, 'Bio cannot exceed 1000 characters']
  },
  consultationFee: {
    type: Number,
    default: 2500,
    min: [0, 'Consultation fee cannot be negative']
  },
  isVerified: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update the updatedAt field before saving
doctorSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Create indexes for better performance
doctorSchema.index({ email: 1 });
doctorSchema.index({ specialization: 1 });
doctorSchema.index({ status: 1 });

const Doctor = mongoose.model('Doctor', doctorSchema);

export default Doctor;
