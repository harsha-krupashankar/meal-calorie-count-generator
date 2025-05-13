import supertest from "supertest";
import app from "../src/app";
import dotenv from "dotenv";
import { userRepository } from "../src/repositories/user.repository";
import jwt from "jsonwebtoken";

// Mock mongoose and userRepository
jest.mock("mongoose", () => ({
    connect: jest.fn().mockResolvedValue(undefined),
    connection: {
        dropDatabase: jest.fn().mockResolvedValue(undefined),
        close: jest.fn().mockResolvedValue(undefined),
        collection: jest.fn().mockReturnValue({
            deleteMany: jest.fn().mockResolvedValue(undefined),
        }),
    },
}));

jest.mock("../src/repositories/user.repository", () => ({
    userRepository: {
        findByEmail: jest.fn(),
    },
}));

// Mock jwt
jest.mock("jsonwebtoken", () => ({
    sign: jest.fn().mockReturnValue("mock-token"),
    verify: jest.fn().mockImplementation((token) => {
        if (token === "mock-token") {
            return { userId: "mockUserId" };
        }
        throw new Error("Invalid token");
    }),
}));

// Mock USDA client
jest.mock("../src/utils/usda-client", () => ({
    searchFood: jest.fn().mockResolvedValue([
        {
            description: "apple",
            foodNutrients: [
                {
                    nutrientNumber: "208",
                    value: 52,
                },
            ],
            servingSize: 100,
        },
    ]),
    pickBestMatch: jest.fn().mockImplementation((foods) => foods[0]),
}));

dotenv.config();

const request = supertest(app);

describe("Calories Endpoints", () => {
    const testUser = {
        firstName: "Test",
        lastName: "User",
        email: "test@example.com",
        password: "password123",
    };

    const mockUser = {
        ...testUser,
        _id: "mockUserId",
        password: "hashedPassword",
    };

    const mockToken = "mock-token";

    beforeEach(() => {
        // Clear all mocks before each test
        jest.clearAllMocks();
        // Mock user lookup for token verification
        (userRepository.findByEmail as jest.Mock).mockResolvedValue(mockUser);
    });

    describe("POST /get-calories", () => {
        it("should get calories for a valid dish", async () => {
            const res = await request
                .post("/get-calories")
                .set("Authorization", `Bearer ${mockToken}`)
                .send({ dish_name: "apple", servings: 2 });

            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty("dish_name", "apple");
            expect(res.body).toHaveProperty("servings", 2);
            expect(res.body).toHaveProperty("calories_per_serving");
            expect(res.body).toHaveProperty("total_calories");
            expect(res.body).toHaveProperty("source", "USDA FoodData Central");
            expect(jwt.verify).toHaveBeenCalledWith(
                mockToken,
                expect.any(String)
            );
        });

        it("should reject request without authentication", async () => {
            const res = await request
                .post("/get-calories")
                .send({ dish_name: "apple", servings: 2 });

            expect(res.status).toBe(401);
            expect(res.body).toHaveProperty("error", "No token");
            expect(jwt.verify).not.toHaveBeenCalled();
        });

        it("should reject request with invalid token", async () => {
            const res = await request
                .post("/get-calories")
                .set("Authorization", "Bearer invalid-token")
                .send({ dish_name: "apple", servings: 2 });

            expect(res.status).toBe(401);
            expect(res.body).toHaveProperty("error", "Invalid token");
            expect(jwt.verify).toHaveBeenCalledWith(
                "invalid-token",
                expect.any(String)
            );
        });

        it("should reject request with zero servings", async () => {
            const res = await request
                .post("/get-calories")
                .set("Authorization", `Bearer ${mockToken}`)
                .send({ dish_name: "apple", servings: 0 });

            expect(res.status).toBe(400);
            expect(res.body).toHaveProperty("error", "Validation failed");
            expect(jwt.verify).toHaveBeenCalled();
        });

        it("should reject request with negative servings", async () => {
            const res = await request
                .post("/get-calories")
                .set("Authorization", `Bearer ${mockToken}`)
                .send({ dish_name: "apple", servings: -1 });

            expect(res.status).toBe(400);
            expect(res.body).toHaveProperty("error", "Validation failed");
            expect(jwt.verify).toHaveBeenCalled();
        });

        it("should handle non-existent dish", async () => {
            // Mock no results from USDA client
            const { searchFood } = require("../src/utils/usda-client");
            (searchFood as jest.Mock).mockResolvedValueOnce([]);

            const res = await request
                .post("/get-calories")
                .set("Authorization", `Bearer ${mockToken}`)
                .send({ dish_name: "nonexistentdish123", servings: 1 });

            expect(res.status).toBe(404);
            expect(res.body).toHaveProperty("error", "Dish not found");
            expect(jwt.verify).toHaveBeenCalled();
        });

        it("should reject request with empty dish name", async () => {
            const res = await request
                .post("/get-calories")
                .set("Authorization", `Bearer ${mockToken}`)
                .send({ dish_name: "", servings: 1 });

            expect(res.status).toBe(400);
            expect(res.body).toHaveProperty("error", "Validation failed");
            expect(jwt.verify).toHaveBeenCalled();
        });

        it("should reject request with too long dish name", async () => {
            const res = await request
                .post("/get-calories")
                .set("Authorization", `Bearer ${mockToken}`)
                .send({ dish_name: "a".repeat(101), servings: 1 });

            expect(res.status).toBe(400);
            expect(res.body).toHaveProperty("error", "Validation failed");
            expect(jwt.verify).toHaveBeenCalled();
        });
    });
});
