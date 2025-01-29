import Chat from "../models/chatModel.js";
export const getChats = async (chatbot_id) => {
  try {
    console.log("Chatbot ID passed to query:", chatbot_id);  // Log the chatbot_id to ensure it's correct

    // Perform the query to find chats by chatbot_id
    const chats = await Chat.find({ chatbot_id: chatbot_id }).sort({ timestamp: 1 });  // Sort by timestamp (oldest first)
    
    console.log("Chats found:", chats);  // Log the result of the query
    return chats;
  } catch (error) {
    console.log("There is an error:", error.message);
    throw new Error("Failed to retrieve chats");
  }
};
