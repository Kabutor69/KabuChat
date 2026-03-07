import express from "express";
import { authMiddleware } from "../middleware/auth.middleware.js";
import {
  createDMConversation,
  getUserConversations
} from "../controllers/conversation.controller.js";

const router = express.Router();

router.post("/dm", authMiddleware, createDMConversation);
router.get("/", authMiddleware, getUserConversations);

export default router;
