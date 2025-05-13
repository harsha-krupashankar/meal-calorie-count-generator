import { Request, Response, NextFunction } from "express";
import { searchFood, pickBestMatch } from "../utils/usda-client";
import { getCaloriesSchema } from "../schemas/calories.schema";
import { ZodError } from "zod";

export const getCalories = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const validatedData = getCaloriesSchema.parse(req.body);
        const { dish_name: rawName, servings } = validatedData;

        const dish_name = sanitizeDishName(rawName);
        if (!dish_name) {
            return res
                .status(400)
                .json({ error: "Invalid dish name after sanitization" });
        }

        const foods = await searchFood(dish_name);

        if (!foods.length)
            return res.status(404).json({ error: "Dish not found" });

        const best = pickBestMatch(foods, dish_name);
        if (!best)
            return res
                .status(404)
                .json({ error: "No nutrition data available" });

        const calNutrient = best.foodNutrients.find(
            (n) => n.nutrientNumber === "208"
        )?.value;

        if (!calNutrient)
            return res.status(404).json({ error: "Calories data missing" });

        const servingGram = best.servingSize ?? 100;
        const caloriesPerServing = (calNutrient / 100) * servingGram;
        const totalCalories = caloriesPerServing * servings;

        res.json({
            dish_name: best.description,
            servings,
            calories_per_serving: Math.round(caloriesPerServing),
            total_calories: Math.round(totalCalories),
            source: "USDA FoodData Central",
        });
    } catch (error) {
        if (error instanceof ZodError) {
            return res.status(400).json({
                error: "Validation failed",
                details: error.errors,
            });
        }
        next(error);
    }
};

function sanitizeDishName(raw: string): string {
    return raw.replace(/[^\w\s]/g, "").replace(/\s+/g, " ");
}
