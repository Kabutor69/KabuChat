import express from "express";
import {
    checkUsernameAvailable,
    getMe,
    searchUsers,
    updateUsername,
} from "../controllers/user.controller.js";
import { authMiddleware } from "../middleware/auth.middleware.js";

const router = express.Router();

router.get("/me", authMiddleware, getMe);
router.get("/search", authMiddleware, searchUsers);
router.get("/username/check", authMiddleware, checkUsernameAvailable);
router.put("/username", authMiddleware, updateUsername);

export default router;
