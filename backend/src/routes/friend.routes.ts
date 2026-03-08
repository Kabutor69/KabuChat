import express from "express";
import {
  acceptFriendRequest,
  getFriends,
  getPendingRequests,
  rejectFriendRequest,
  sendFriendRequest,
} from "../controllers/friend.controller.js";
import { authMiddleware } from "../middleware/auth.middleware.js";

const router = express.Router();

router.post("/request", authMiddleware, sendFriendRequest);
router.post("/accept", authMiddleware, acceptFriendRequest);
router.post("/reject", authMiddleware, rejectFriendRequest);
router.get("/", authMiddleware, getFriends);
router.get("/requests", authMiddleware, getPendingRequests);

export default router;
