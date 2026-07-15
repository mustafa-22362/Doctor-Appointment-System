import express from 'express';
import {
  createAppointment,
  getUserAppointments,
  getDoctorAppointments,
  getAppointmentById,
  updateAppointmentStatus,
  cancelAppointment,
  getAvailableTimeSlots,
  getAdminDashboardStats
} from '../Controllers/appointmentController.js';
import { authenticate, authorize } from '../Middleware/auth.js';

const router = express.Router();

// Public routes
router.get('/available-slots/:doctorId/:date', getAvailableTimeSlots);

// Protected routes - require authentication
router.use(authenticate);

// User routes
router.post('/', authorize('user'), createAppointment);
router.get('/my-appointments', authorize('user'), getUserAppointments);
router.get('/:id', getAppointmentById);
router.put('/:id/cancel', authorize('user'), cancelAppointment);

// Doctor routes
router.get('/doctor/my-appointments', authorize('doctor'), getDoctorAppointments);
router.put('/:id/status', authorize('doctor'), updateAppointmentStatus);

// Admin routes
router.get('/admin/stats', authorize('admin'), getAdminDashboardStats);

export default router;
