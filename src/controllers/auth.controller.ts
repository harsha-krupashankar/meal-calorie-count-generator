import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { registerSchema } from "../schemas/user.schema";
import { userRepository } from "../repositories/user.repository";
import { ZodError } from "zod";
import { MongoError } from "mongodb";
import dotenv from "dotenv";
dotenv.config();

export async function register(
    req: Request,``
    res: Response,
    next: NextFunction
) {
    try {
        const validatedData = registerSchema.parse(req.body);
        await userRepository.save({
            firstName: validatedData.firstName,
            lastName: validatedData.lastName,
            email: validatedData.email,
            password: validatedData.password,
        });
        res.status(201).json({ message: "User registered successfully" });
    } catch (error: unknown) {
        if (error instanceof MongoError && error.code === 11000) {
            return res.status(400).json({ error: "Email already in use" });
        }
        if (error instanceof ZodError) {
            return res.status(400).json({
                error: "Validation failed",
                details: error.errors,
            });
        }
        next(error);
    }
}

export async function login(req: Request, res: Response, next: NextFunction) {
    try {
        const { email, password } = registerSchema
            .pick({ email: true, password: true })
            .parse(req.body);

        const user = await userRepository.findByEmail(email);

        if (!user || !(await user.comparePassword(password))) {
            return res.status(401).json({ error: "Invalid credentials" });
        }

        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET!, {
            expiresIn: "1h",
        });
        res.json({ token });
    } catch (error: unknown) {
        if (error instanceof ZodError) {
            return res.status(400).json({
                error: "Validation failed",
                details: error.errors,
            });
        }
        next(error);
    }
}
