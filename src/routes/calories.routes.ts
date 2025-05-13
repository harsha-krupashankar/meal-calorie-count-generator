import { Router, RequestHandler } from "express";
import { getCalories } from "../controllers/calories.controller";
import { verifyToken } from "../middlewares/auth.middleware";
import rateLimit from "express-rate-limit";
import apicache from "apicache";

const router = Router();

const caloriesLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 30,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        error: "Too many requests from this IP, please try again after 15 minutes",
    },
});

const cache = apicache.middleware;

router.post(
    "/get-calories",
    verifyToken as RequestHandler,
    caloriesLimiter,
    cache("1 minutes"),
    getCalories as RequestHandler
);
export default router;
