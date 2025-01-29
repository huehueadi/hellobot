import bcrypt from "bcrypt";
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from "uuid";
import chatbotModel from "../models/userModel.js";


export const chatbotRegister = async (username, password, userid) => {
  try {
    const existingChatbot = await chatbotModel.findOne({ userid });
    if (existingChatbot) {
      throw new Error("User ID already exists, please choose a different one.");
    }

    const existingUsername = await chatbotModel.findOne({ username });
    if (existingUsername) {
      throw new Error("Username already exists, please choose a different one.");
    }
    const generatedUserId = uuidv4();

    const hashedPassword = await bcrypt.hash(password, 10); 

    const newChatbot = new chatbotModel({
      username,
      password: hashedPassword,
      userid: generatedUserId
    });

    await newChatbot.save();

    return {
      success: true,
      message: "Chatbot registered successfully."
    };
  } catch (error) {
    return {
      success: false,
      message: error.message
    };
  }
};


export const chatbotLoginService = async (username, password) => {
    try {
     
      const chatbot = await chatbotModel.findOne({ username });
  
      if (!chatbot) {
        throw new Error("Username not found.");
      }
  
      const isPasswordValid = await bcrypt.compare(password, chatbot.password);
      
      if (!isPasswordValid) {
        throw new Error("Incorrect password.");
      }
  
      const payload = {
        userId: chatbot.userid,  // Unique userId
        username: chatbot.username,  // Username
        createdAt: chatbot.createdAt,  // Optional: Account creation timestamp
      };
  
      const token = jwt.sign(payload, "key", { expiresIn: "1h" });  // Token expires in 1 hour
  
      return {
        success: true,
        message: "Login successful.",
        token,
        payload
      };
  
    } catch (error) {
      return {
        success: false,
        message: error.message || "An error occurred during login."
      };
    }
  };
