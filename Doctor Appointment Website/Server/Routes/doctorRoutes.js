import express from 'express';
import {
  registerDoctor,
  getDoctorProfile,
  updateDoctorProfile,
  updateDoctorTimeSlots,
  getAllDoctors,
  getDoctorById,
  updateDoctorStatus,
  updateDoctorProfileAdmin,
  deleteDoctor,
  getDoctorsBySpecialization
} from '../Controllers/doctorController.js';
import { authenticate, authorize } from '../Middleware/auth.js';
import upload from '../Middleware/upload.js';

const router = express.Router();

// Public routes - More specific routes FIRST, generic routes LAST
router.get('/specialization/:specialization', getDoctorsBySpecialization);
router.get('/:id', getDoctorById);
router.get('/', getAllDoctors);

// Protected routes (require authentication)
router.use(authenticate); // All routes below require authentication

// Doctor profile routes (Doctor only)
router.get('/profile/me', authorize('doctor'), getDoctorProfile);
router.put('/profile/me', authorize('doctor'), updateDoctorProfile);
router.put('/time-slots/me', authorize('doctor'), updateDoctorTimeSlots);

// Admin only routes
router.post('/admin/register', authorize('admin'), upload.single('image'), registerDoctor);
router.put('/admin/:id', authorize('admin'), upload.single('image'), updateDoctorProfileAdmin);
router.put('/admin/:id/status', authorize('admin'), updateDoctorStatus);
router.delete('/admin/:id', authorize('admin'), deleteDoctor);

export default router;
