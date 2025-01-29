import { chatbotLoginService, chatbotRegister } from "../services/authUserService.js";
export const registerChatbot = async (req, res) => {
  const { username, password } = req.body;

  // Step 1: Validate incoming data
  if (!username || !password ) {
    return res.status(400).json({
      success: false,
      message: "Please provide username, password, and userId."
    });
  }

  try {
    const result = await chatbotRegister(username, password);

    if (result.success) {
      return res.status(201).json({
        success: true,
        message: result.message
      });
    } else {
      return res.status(400).json({
        success: false,
        message: result.message
      });
    }
  } catch (error) {
    console.error("Registration error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error."
    });
  }
};


export const loginChatbot = async (req, res) => {
    const { username, password } = req.body;
  
    // Step 1: Validate incoming data
    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: "Please provide both username and password."
      });
    }
  
    try {
      // Step 2: Call the login service to handle the login logic
      const result = await chatbotLoginService(username, password);
  
      // Step 3: Handle success or failure
      if (result.success) {
        return res.status(200).json({
          success: true,
          message: result.message,
          token: result.token,
          payload: result.payload
            // Send back the generated JWT token
        });
      } else {
        return res.status(400).json({
          success: false,
          message: result.message
        });
      }
    } catch (error) {
      console.error("Login error:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error."
      });
    }
  };