import express from "express";
import {
  deleteMessage,
  editMessage,
  getMessages,
  markConversationAsRead,
  sendMessage,
} from "../controllers/message.controller.js";
import { authMiddleware } from "../middleware/auth.middleware.js";

const router = express.Router();

router.post("/send", authMiddleware, sendMessage);
router.get("/:conversationId", authMiddleware, getMessages);
router.post("/:conversationId/read", authMiddleware, markConversationAsRead);
router.delete("/:messageId", authMiddleware, deleteMessage);
router.put("/:messageId", authMiddleware, editMessage);

export default router;
