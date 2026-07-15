import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import bodyParser from "body-parser";
import cookieParser from 'cookie-parser';
import path from 'path';
import { fileURLToPath } from 'url';
// Import Routes
import doctorRoutes from './Routes/doctorRoutes.js';
import userRoutes from './Routes/userRoutes.js';
import appointmentRoutes from './Routes/appointmentRoutes.js';
import contactRoutes from './Routes/contactRoutes.js';

const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Middleware
app.use(cors({
  origin: "http://localhost:3000", // Frontend URL
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(bodyParser.json({ extended: true }));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser()); // Add cookie parser middleware

// Serve static files from uploads directory
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// MongoDB Connection
// Using local MongoDB - make sure MongoDB is running on your system
// To use MongoDB Atlas instead, set the MONGODB_URI environment variable
const mongoURI = process.env.MONGODB_URI || "mongodb://localhost:27017/doctor_appointment";

mongoose.connect(mongoURI, {
  serverSelectionTimeoutMS: 5000,
  connectTimeoutMS: 10000,
})
  .then(() => console.log("✅ Connected to MongoDB database"))
  .catch((err) => {
    console.error("❌ Database connection error:", err.message);
    console.error("⚠️  WARNING: App is running but database is unavailable. Registration and login will fail.");
    console.error("💡 TIP: Make sure MongoDB is running locally or set MONGODB_URI environment variable for Atlas.");
  });





// API Routes
app.use('/api/doctors', doctorRoutes);
app.use('/api/users', userRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/contact', contactRoutes);



const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📱 Frontend URL: http://localhost:3000`);
  console.log(`🔗 API URL: http://localhost:${PORT}`);
});