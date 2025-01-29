import mongoose from "mongoose";

const registerChatbot = new mongoose.Schema({
    username:{
        type:String,
        unique:true,
        required:true
    },
    userid:{
        type:String,
        unique:true,
        required:true
    },
    password:{
        type:String,
        required:true
    }
})

const chatbotModel = mongoose.model('chatbotModel', registerChatbot)

export default chatbotModel