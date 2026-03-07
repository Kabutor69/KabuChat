import express from "express";
import { authMiddleware } from "../middleware/auth.middleware.js";
import {
  sendMessage,
  getMessages
} from "../controllers/message.controller.js";

const router = express.Router();

router.post("/send", authMiddleware, sendMessage);
router.get("/:conversationId", authMiddleware, getMessages);

export default router;
