import AWS from 'aws-sdk';
import axios from 'axios';
import Chat from '../models/chatModel.js';
import ScrapedData from '../models/scrappedDataModel.js';
import { generateResponse } from '../services/aiService.js';

import dotenv from 'dotenv';

// Load environment variables from the .env file
dotenv.config();

const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION,
});
export const handleChat = async (req, res) => {
  const { message } = req.body;

  const {userid} = req.params

  if (!message) {
    return res.status(400).json({ error: 'Message is required' });
  }

  if (!userid) {
    return res.status(400).json({ error: 'UUID for the scraped data is required' });
  }

  try {
    // Fetch the scraped data record from the database
    const scrapedDataRecord = await ScrapedData.findOne({ userid});
    if (!scrapedDataRecord) {
      return res.status(404).json({ error: 'Scraped data not found for the provided UUID' });
    }

    // Fetch the actual scraped data from S3
    const s3Data = await fetchDataFromS3(scrapedDataRecord.s3Url);

    // Log the fetched S3 data to ensure it's valid

    // Check if scraped data is valid
    if (!s3Data || s3Data.length === 0) {
      return res.status(400).json({ error: 'No valid scraped data found' });
    }

    // Format the scraped data and user message into a prompt
    const formattedPrompt = formatScrapedDataForAI(s3Data, message);

    // Log the formatted prompt before sending it to the AI

    // Generate a response using the AI service
    const botResponse = await generateResponse(formattedPrompt);

    // Log the AI response for debugging
    console.log("AI Response:", botResponse);

    // Log the chat for future reference
    const chatLog = new Chat({
      user_message: message,
      bot_response: botResponse,
      chatbot_id: scrapedDataRecord.userid,  
    });
    await chatLog.save();

    // Send the response back to the user
    res.json({ response: botResponse });
  } catch (err) {
    console.error('Error handling chat:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Function to format the scraped data for AI
const formatScrapedDataForAI = (scrapedData, userQuery) => {
  // Join the scraped data if it's an array of text
  const formattedText = Array.isArray(scrapedData) 
    ? scrapedData.join("\n\n") 
    : scrapedData;  // If it's a string, just use it as is

  if (!formattedText) {
    console.error("Formatted text is empty");
  }

  console.log("Formatted Text for AI:", formattedText);  // Debugging line

  // Create the prompt with both the scraped data and the user's query
  return `Here is website data:\n\n${formattedText}\n\nUser's question answer in short: ${userQuery}\nResponse:`;
};


const fetchDataFromS3 = async (s3Url) => {
  try {
    const response = await axios.get(s3Url);

    // Log the full response and type of scrapedData for debugging
    const scrapedData = response.data;
    console.log("Full S3 Response:", response);  
    console.log("Fetched S3 Data:", scrapedData);  // Log the data itself
    console.log("Type of Fetched Data:", typeof scrapedData);  // Log the type of scrapedData

    // If it's an array, process each item
    if (Array.isArray(scrapedData)) {
      let filteredData = [];

      scrapedData.forEach((item, index) => {
        console.log(`Processing item #${index}:`, item);  // Log each item to understand its structure

        // Check for 'paragraphs' and 'links' keys
        if (item.paragraphs && Array.isArray(item.paragraphs)) {
          const validParagraphs = item.paragraphs.filter(paragraph => paragraph.trim() !== "" && paragraph !== "Test Mode");
          filteredData.push(...validParagraphs);
        } else {
          console.log(`Item #${index} does not have valid 'paragraphs' key or it's not an array.`);
        }

        if (item.links && Array.isArray(item.links)) {
          const validLinks = item.links.filter(link => typeof link === 'string' && link.includes("http"));
          filteredData.push(...validLinks);
        } else {
          console.log(`Item #${index} does not have valid 'links' key or it's not an array.`);
        }
      });

      // If filteredData has valid paragraphs or links, return them
      if (filteredData.length > 0) {
        console.log("Filtered Data:", filteredData);  // Log the filtered data
        return filteredData.join("\n\n");  // Return the joined string
      } else {
        console.log("No valid paragraphs or links found.");
      }
    } else if (typeof scrapedData === 'object') {
      // If scrapedData is an object, log it and handle differently (you can decide on processing logic here)
      console.log("S3 Data is an object, not an array.");
      return JSON.stringify(scrapedData);  // Example: Just stringify the object if it's not an array
    } else {
      console.log("S3 Data is neither an array nor an object.");
      return '';  // Return empty if data is neither an array nor an object
    }

    // If no valid data was found or not processed, return empty string
    return '';
  } catch (error) {
    console.error('Error fetching data from S3:', error);
    throw new Error('Failed to fetch data from S3');
  }
};




// Format the scraped data and user query into a prompt for the AI model
// const formatScrapedDataForAI = (scrapedData, userQuery) => {
//   // Ensure we only join if it's an array
//   const formattedText = Array.isArray(scrapedData) 
//     ? scrapedData.join("\n\n") 
//     : scrapedData;  // If it's a string, just use it as is

//   if (!formattedText) {
//     console.error("Formatted text is empty");
//   }

//   console.log("Formatted Text for AI:", formattedText);  // Debugging line

//   // Return the prompt with both the scraped data and the user's query
//   return `Here is some scraped data:\n\n${formattedText}\n\nUser's question: ${userQuery}\nResponse:`;
// };



// import fs from 'fs';
// import path from 'path';
// import axios from 'axios';

// // Use import.meta.url to get the current directory in ES module
// const __filename = new URL(import.meta.url).pathname;
// const __dirname = path.dirname(__filename);

// // Path to the scraped data file in the root directory
// const scrapedDataFilePath = path.join(__dirname, 'all_pages_scraped.json'); // This assumes it's in the root folder

// // Log the file path for debugging
// console.log('Scraped data file path:', scrapedDataFilePath);  // Log to ensure the path is correct

// // Gemini API configuration
// const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';
// const GEMINI_API_KEY = 'YOUR_API_KEY';  // Replace with your actual Gemini API key

// // Function to read scraped data from the local file
// const readScrapedDataFromLocalFile = () => {
//   try {
//     const rawData = fs.readFileSync(scrapedDataFilePath, 'utf8');
//     return JSON.parse(rawData);  // Parse and return the scraped data
//   } catch (error) {
//     console.error('Error reading file at path:', scrapedDataFilePath);
//     throw new Error('Error reading scraped data from local file');
//   }
// };

// // Controller function to handle user input and send the request to the API
// export const generateContentFromUserInput = async (req, res) => {
//   const { message } = req.body;  // Extract the user message (question)

//   // Check if the message is provided
//   if (!message) {
//     return res.status(400).json({ error: 'Message is required' });
//   }

//   try {
//     // Read the scraped data from the local file
//     const scrapedData = readScrapedDataFromLocalFile();

//     // Prepare the content for the API request
//     const content = {
//       paragraphs: scrapedData.paragraphs.join(' '),  // Joining paragraphs into a single string
//       links: scrapedData.links.join(' '),  // Joining links into a single string
//       urls: scrapedData.urls.join(' ')  // Joining URLs into a single string
//     };

//     // Combine the user input and the content into a prompt for the API
//     const prompt = `${message}\n\nHere is the content:\n${content.paragraphs}`;

//     // Make the request to the Gemini API
//     const response = await axios.post(
//       GEMINI_API_URL,
//       {
//         model: "gemini-1.5-flash",  // Specify the model ID
//         input: prompt               // Send the user input and content as the input
//       },
//       {
//         headers: {
//           'Authorization': `Bearer ${GEMINI_API_KEY}`,
//           'Content-Type': 'application/json'
//         }
//       }
//     );

//     // Process the response from Gemini API
//     const generatedResponse = response.data;  // The response from Gemini API

//     // Return the generated content to the user
//     res.status(200).json({
//       message: 'Content generated successfully',
//       generatedContent: generatedResponse
//     });

//   } catch (err) {
//     console.error('Error generating content:', err.message);
//     res.status(500).json({ error: 'Internal server error' });
//   }
// };
