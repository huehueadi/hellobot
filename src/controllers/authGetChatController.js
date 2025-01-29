import { getChats } from "../services/authGetChatService.js";
export const handleGetChats = async (req, res) => {
  const { chatbot_id } = req.params;  // Make sure chatbot_id is extracted correctly
  console.log("Received chatbot_id:", chatbot_id);  // Log the chatbot_id to ensure it's correct

  try {
    const chats = await getChats(chatbot_id);

    // Return the chats in the response
    res.status(200).json({ message: "Chats retrieved successfully", chats:chats });
  } catch (error) {
    console.log("Error in retrieving chats:", error.message);
    res.status(500).json({ error: error.message || "Failed to retrieve chats" });
  }
};
