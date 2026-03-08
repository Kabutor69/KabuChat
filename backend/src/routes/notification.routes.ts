import express from "express";
import {
    registerPushToken,
    removePushToken,
} from "../controllers/notification.controller.js";
import { authMiddleware } from "../middleware/auth.middleware.js";

const router = express.Router();

router.post("/register", authMiddleware, registerPushToken);
router.post("/remove", authMiddleware, removePushToken);

export default router;
