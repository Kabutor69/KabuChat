import express from "express";
import {
  acceptFriendRequest,
  cancelFriendRequest,
  getFriends,
  getPendingRequests,
  rejectFriendRequest,
  removeFriend,
  sendFriendRequest,
} from "../controllers/friend.controller.js";
import { authMiddleware } from "../middleware/auth.middleware.js";

const router = express.Router();

router.post("/request", authMiddleware, sendFriendRequest);
router.post("/request/cancel", authMiddleware, cancelFriendRequest);
router.post("/accept", authMiddleware, acceptFriendRequest);
router.post("/reject", authMiddleware, rejectFriendRequest);
router.post("/remove", authMiddleware, removeFriend);
router.get("/", authMiddleware, getFriends);
router.get("/requests", authMiddleware, getPendingRequests);

export default router;
