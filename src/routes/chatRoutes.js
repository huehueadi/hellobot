import express from 'express';
import { handleGetChats } from '../controllers/authGetChatController.js';
import { loginChatbot, registerChatbot } from '../controllers/authUserController.js';
import { handleChat } from '../controllers/chatController.js';
import { scrapeWebsiteController } from '../controllers/scrapingController.js';
import authentication from '../middleware/authenticationMiddleware.js';


const router = express.Router();

router.post('/chat/:userid', handleChat);
// router.post('/chat', generateContentFromUserInput);

router.post('/scrape',authentication, scrapeWebsiteController);
router.post('/register', registerChatbot)
router.post('/get',loginChatbot)
router.get('/getchats/:chatbot_id' ,handleGetChats)
// router.post('/t1/chat', handleUserInput);
// router.post('/t1/scrape', extractWebsiteContent );
// router.post('/generate-content', generateContentController);



export default router;