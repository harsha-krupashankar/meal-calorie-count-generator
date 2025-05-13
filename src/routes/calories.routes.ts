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

const cacheInstance = apicache.options({
    appendKey: (req) => JSON.stringify(req.body),
}).middleware;

router.post(
    "/get-calories",
    verifyToken as RequestHandler,
    caloriesLimiter,
    cacheInstance("1 minutes"),
    getCalories as RequestHandler
);
export default router;
