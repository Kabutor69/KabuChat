import express from "express";
import { authMiddleware } from "../middleware/auth.middleware.js";
import {
  sendFriendRequest,
  acceptFriendRequest,
  getFriends,
} from "../controllers/friend.controller.js";

const router = express.Router();

router.post("/request", authMiddleware, sendFriendRequest);
router.post("/accept", authMiddleware, acceptFriendRequest);
router.get("/", authMiddleware, getFriends);

export default router;