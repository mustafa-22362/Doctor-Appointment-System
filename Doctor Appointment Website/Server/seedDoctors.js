import mongoose from 'mongoose';
import Doctor from './models/Doctor.js';
import User from './models/User.js';

// MongoDB Connection
const mongoURI = process.env.MONGODB_URI || "mongodb://localhost:27017/doctor_appointment";

const seedDoctors = async () => {
  try {
    // Connect to database
    await mongoose.connect(mongoURI, {
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 10000,
    });
    console.log('✅ Connected to MongoDB database');

    // Clear existing doctors and users
    await Doctor.deleteMany({});
    await User.deleteMany({});
    console.log('🧹 Cleared existing doctors and users');

    // Sample doctors data
    const sampleDoctors = [
      {
        name: 'Dr. Ahmed Hassan',
        email: 'ahmed.hassan@hospital.com',
        phone: '923001234567',
        specialization: 'Cardiology',
        experience: 12,
        licenseNumber: 'DOC-CARD-001',
        qualifications: ['MBBS', 'Cardiology Specialist', 'Advanced Echocardiography'],
        bio: 'Expert cardiologist with 12 years of experience in treating heart diseases.',
        consultationFee: 3000,
        status: 'Active',
        rating: 4.8,
        image: 'default-doctor.jpg'
      },
      {
        name: 'Dr. Fatima Khan',
        email: 'fatima.khan@hospital.com',
        phone: '923002345678',
        specialization: 'Pediatrics',
        experience: 8,
        licenseNumber: 'DOC-PED-001',
        qualifications: ['MBBS', 'Pediatrics Specialist', 'Child Development'],
        bio: 'Compassionate pediatrician dedicated to children\'s health and wellness.',
        consultationFee: 2500,
        status: 'Active',
        rating: 4.9,
        image: 'default-doctor.jpg'
      },
      {
        name: 'Dr. Muhammad Ali',
        email: 'muhammad.ali@hospital.com',
        phone: '923003456789',
        specialization: 'Neurology',
        experience: 15,
        licenseNumber: 'DOC-NEURO-001',
        qualifications: ['MBBS', 'Neurology Specialist', 'Epilepsy Management'],
        bio: 'Senior neurologist with expertise in brain and nervous system disorders.',
        consultationFee: 3500,
        status: 'Active',
        rating: 4.7,
        image: 'default-doctor.jpg'
      },
      {
        name: 'Dr. Amira Malik',
        email: 'amira.malik@hospital.com',
        phone: '923004567890',
        specialization: 'Dermatology',
        experience: 10,
        licenseNumber: 'DOC-DERM-001',
        qualifications: ['MBBS', 'Dermatology Specialist', 'Cosmetic Surgery'],
        bio: 'Expert dermatologist offering comprehensive skin care solutions.',
        consultationFee: 2800,
        status: 'Active',
        rating: 4.6,
        image: 'default-doctor.jpg'
      },
      {
        name: 'Dr. Hassan Raza',
        email: 'hassan.raza@hospital.com',
        phone: '923005678901',
        specialization: 'Orthopedics',
        experience: 14,
        licenseNumber: 'DOC-ORTHO-001',
        qualifications: ['MBBS', 'Orthopedics Specialist', 'Joint Replacement'],
        bio: 'Experienced orthopedic surgeon specializing in bone and joint care.',
        consultationFee: 3200,
        status: 'Active',
        rating: 4.8,
        image: 'default-doctor.jpg'
      },
      {
        name: 'Dr. Zainab Ahmed',
        email: 'zainab.ahmed@hospital.com',
        phone: '923006789012',
        specialization: 'Gynecology',
        experience: 11,
        licenseNumber: 'DOC-GYN-001',
        qualifications: ['MBBS', 'Gynecology Specialist', 'Obstetrics'],
        bio: 'Dedicated gynecologist providing comprehensive women\'s health care.',
        consultationFee: 2900,
        status: 'Active',
        rating: 4.9,
        image: 'default-doctor.jpg'
      },
      {
        name: 'Dr. Karim Siddiqui',
        email: 'karim.siddiqui@hospital.com',
        phone: '923007890123',
        specialization: 'Psychiatry',
        experience: 9,
        licenseNumber: 'DOC-PSY-001',
        qualifications: ['MBBS', 'Psychiatry Specialist', 'Cognitive Therapy'],
        bio: 'Compassionate psychiatrist focusing on mental health and well-being.',
        consultationFee: 2700,
        status: 'Active',
        rating: 4.7,
        image: 'default-doctor.jpg'
      },
      {
        name: 'Dr. Layla Hassan',
        email: 'layla.hassan@hospital.com',
        phone: '923008901234',
        specialization: 'Ophthalmology',
        experience: 13,
        licenseNumber: 'DOC-OPH-001',
        qualifications: ['MBBS', 'Ophthalmology Specialist', 'Cataract Surgery'],
        bio: 'Expert eye surgeon with advanced laser and surgical capabilities.',
        consultationFee: 3100,
        status: 'Active',
        rating: 4.8,
        image: 'default-doctor.jpg'
      },
      {
        name: 'Dr. Omar Khan',
        email: 'omar.khan@hospital.com',
        phone: '923009012345',
        specialization: 'ENT',
        experience: 7,
        licenseNumber: 'DOC-ENT-001',
        qualifications: ['MBBS', 'ENT Specialist', 'Sinusitis Management'],
        bio: 'Skilled ENT specialist treating ear, nose, and throat conditions.',
        consultationFee: 2400,
        status: 'Active',
        rating: 4.5,
        image: 'default-doctor.jpg'
      },
      {
        name: 'Dr. Sara Ali',
        email: 'sara.ali@hospital.com',
        phone: '923000123456',
        specialization: 'General Medicine',
        experience: 6,
        licenseNumber: 'DOC-GM-001',
        qualifications: ['MBBS', 'General Medicine', 'Internal Medicine'],
        bio: 'Dedicated general practitioner providing primary healthcare services.',
        consultationFee: 2000,
        status: 'Active',
        rating: 4.6,
        image: 'default-doctor.jpg'
      }
    ];

    // Create doctors with user accounts
    for (const doctorData of sampleDoctors) {
      // Create user account first
      const user = new User({
        firstName: doctorData.name.split(' ')[1] || 'Doctor',
        lastName: doctorData.name.split(' ').slice(2).join(' ') || doctorData.name.split(' ')[0],
        email: doctorData.email,
        phone: doctorData.phone,
        password: 'Doctor@123456', // Default password
        role: 'doctor'
      });

      const savedUser = await user.save();
      console.log(`✅ Created user: ${doctorData.name}`);

      // Create doctor profile with the user ID
      const doctor = new Doctor({
        user: savedUser._id,
        name: doctorData.name,
        email: doctorData.email,
        phone: doctorData.phone,
        specialization: doctorData.specialization,
        experience: doctorData.experience,
        licenseNumber: doctorData.licenseNumber,
        qualifications: doctorData.qualifications,
        bio: doctorData.bio,
        consultationFee: doctorData.consultationFee,
        status: doctorData.status,
        rating: doctorData.rating,
        image: doctorData.image
      });

      await doctor.save();
      console.log(`✅ Created doctor profile: ${doctorData.name}`);
    }

    console.log(`\n✨ Successfully seeded ${sampleDoctors.length} doctors to the database!`);
    console.log('📋 Doctors created:');
    sampleDoctors.forEach(doctor => {
      console.log(`  - ${doctor.name} (${doctor.specialization}) - ${doctor.email}`);
    });
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding doctors:', error.message);
    process.exit(1);
  }
};

// Run the seed function
seedDoctors();
