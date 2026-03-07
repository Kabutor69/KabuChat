import express from "express";
import { getMe, searchUsers } from "../controllers/user.controller.js";
import { authMiddleware } from "../middleware/auth.middleware.js";

const router = express.Router();

router.get("/me", authMiddleware, getMe);
router.get("/search", authMiddleware, searchUsers);

export default router;
