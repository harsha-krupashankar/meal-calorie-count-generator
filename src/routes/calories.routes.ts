import { Router, RequestHandler } from "express";
import { getCalories } from "../controllers/calories.controller";
import { verifyToken } from "../middlewares/auth.middleware";

const router = Router();
router.post(
    "/get-calories",
    verifyToken as RequestHandler,
    getCalories as RequestHandler
);
export default router;
