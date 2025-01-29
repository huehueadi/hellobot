import bodyParser from 'body-parser';
import cors from 'cors';
import express from 'express';
import connectDB from './src/config/db.js';
import router from './src/routes/chatRoutes.js';

import dotenv from 'dotenv';

// Load environment variables from the .env file
dotenv.config();

const app = express();

// Middleware
app.use(cors({
  origin: 'http://localhost:3001', // Allow this specific origin
}));

app.use(bodyParser.json());

// Database Connection
connectDB();

// Routes
app.use('/v1', router);
app.use('/', (req, res) => {
  res.send("hello world");
});

// Start Server
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
