import mongoose from 'mongoose';

const connectDB = async () => {
  try {
    await mongoose.connect('mongodb+srv://temploginoffice:TJ33HDQzdsTJo0an@cluster0.ti7pl.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0');
    console.log('Database connected');
  } catch (err) {
    console.error('Database connection error:', err.message);
    process.exit(1);
  }
};

export default connectDB;
