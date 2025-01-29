import jwt from "jsonwebtoken";

const authentication = (req, res, next) => {
  // Extract the Authorization header
  const authHeader = req.headers['authorization'];
  
  // If no Authorization header is found, return an error
  if (!authHeader) {
    return res.status(401).json({
      message: "Authorization token is required.",
      success: false,
    });
  }

  // Extract the token part of the Authorization header (Bearer <token>)
 

  // Verify the JWT token
  jwt.verify(authHeader, "key", (error, user) => {
    if (error) {
      return res.status(403).json({
        message: "Forbidden: Invalid token",
        success: false,
      });
    }
    
    // Attach the user information to the request object
    req.user = user;
    next();
  });
};

export default authentication;
