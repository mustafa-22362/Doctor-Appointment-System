import mongoose from 'mongoose';

const appointmentSchema = new mongoose.Schema({
  // Patient information
  patient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // Doctor information
  doctor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Doctor',
    required: true
  },
  
  // Appointment details
  appointmentDate: {
    type: Date,
    required: true
  },
  
  timeSlot: {
    start: {
      type: String,
      required: true
    },
    end: {
      type: String,
      required: true
    }
  },
  
  // Appointment status
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'completed', 'cancelled'],
    default: 'pending'
  },
  
  // Patient information for the appointment
  patientInfo: {
    name: {
      type: String,
      required: true
    },
    email: {
      type: String,
      required: true
    },
    phone: {
      type: String,
      required: true
    },
    age: {
      type: Number,
      required: true,
      min: 1,
      max: 120
    },
    gender: {
      type: String,
      enum: ['male', 'female', 'other'],
      required: true
    }
  },
  
  // Medical information
  reason: {
    type: String,
    required: true,
    maxlength: [500, 'Reason cannot exceed 500 characters']
  },
  
  symptoms: {
    type: String,
    maxlength: [1000, 'Symptoms cannot exceed 1000 characters']
  },
  
  // Doctor's notes (filled by doctor)
  doctorNotes: {
    type: String,
    maxlength: [1000, 'Doctor notes cannot exceed 1000 characters']
  },
  
  // Consultation fee
  consultationFee: {
    type: Number,
    required: true,
    min: 0
  },
  
  // Payment status
  paymentStatus: {
    type: String,
    enum: ['pending', 'paid', 'refunded'],
    default: 'pending'
  },
  
  // Appointment type
  appointmentType: {
    type: String,
    enum: ['consultation', 'follow-up', 'emergency'],
    default: 'consultation'
  },
  
  // Follow-up appointment reference
  followUpAppointment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Appointment'
  },
  
  // Cancellation information
  cancellationReason: {
    type: String,
    maxlength: [500, 'Cancellation reason cannot exceed 500 characters']
  },
  
  // Timestamps
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
appointmentSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Indexes for better performance
appointmentSchema.index({ patient: 1, appointmentDate: 1 });
appointmentSchema.index({ doctor: 1, appointmentDate: 1 });
appointmentSchema.index({ status: 1 });
appointmentSchema.index({ appointmentDate: 1, timeSlot: 1 });

// Virtual for formatted appointment date
appointmentSchema.virtual('formattedDate').get(function() {
  return this.appointmentDate.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
});

// Virtual for formatted time slot
appointmentSchema.virtual('formattedTimeSlot').get(function() {
  return `${this.timeSlot.start} - ${this.timeSlot.end}`;
});

// Instance method to check if appointment is in the past
appointmentSchema.methods.isPast = function() {
  const now = new Date();
  const appointmentDateTime = new Date(this.appointmentDate);
  appointmentDateTime.setHours(parseInt(this.timeSlot.start.split(':')[0]));
  appointmentDateTime.setMinutes(parseInt(this.timeSlot.start.split(':')[1]));
  return appointmentDateTime < now;
};

// Instance method to check if appointment can be cancelled
appointmentSchema.methods.canBeCancelled = function() {
  const now = new Date();
  const appointmentDateTime = new Date(this.appointmentDate);
  appointmentDateTime.setHours(parseInt(this.timeSlot.start.split(':')[0]));
  appointmentDateTime.setMinutes(parseInt(this.timeSlot.start.split(':')[1]));
  
  // Can be cancelled if it's more than 2 hours before the appointment
  const twoHoursBefore = new Date(appointmentDateTime.getTime() - (2 * 60 * 60 * 1000));
  return now < twoHoursBefore && ['pending', 'approved'].includes(this.status);
};

const Appointment = mongoose.model('Appointment', appointmentSchema);

export default Appointment;
