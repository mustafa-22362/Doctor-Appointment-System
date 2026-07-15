import express from 'express';
import {
  registerUser,
  loginUser,
  getProfile,
  updateProfile,
  changePassword,
  logoutUser,
  getAllUsers,
  updateUserRole,
  updateUserStatus,
  updateUserProfile,
  deleteUser
} from '../Controllers/userController.js';
import { authenticate, authorize } from '../Middleware/auth.js';

const router = express.Router();

// Public routes
router.post('/register', registerUser);
router.post('/login', loginUser);

// Protected routes (require authentication)
router.use(authenticate); // All routes below require authentication

// User profile routes
router.get('/profile', getProfile);
router.put('/profile', updateProfile);
router.put('/change-password', changePassword);
router.post('/logout', logoutUser);

// Admin only routes
router.get('/admin/users', authorize('admin'), getAllUsers);
router.put('/admin/users/:userId/role', authorize('admin'), updateUserRole);
router.put('/admin/users/:userId/status', authorize('admin'), updateUserStatus);
router.put('/admin/users/:userId', authorize('admin'), updateUserProfile);
router.delete('/admin/users/:userId', authorize('admin'), deleteUser);

export default router;
