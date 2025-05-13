import express, { Application, Request, Response, NextFunction } from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import authRoutes from "./routes/auth.routes";
import calRoutes from "./routes/calories.routes";
dotenv.config();

const app: Application = express();
// Trust proxy (needed when behind a reverse proxy like Render)
app.set("trust proxy", 1);

app.use(express.json());

app.use("/auth", authRoutes);
app.use("/", calRoutes);

app.get("/health", (req: Request, res: Response) => {
    res.status(200).json({ status: "OK" });
});

app.use((err: any, req: Request, res: Response, next: NextFunction) => {
    console.error(err);
    res.status(500).json({ error: "Server error" });
});

// Export the app instance
export default app;

// Only start the server if this file is run directly
if (require.main === module) {
    const PORT = process.env.PORT ?? 3000;
    mongoose
        .connect(process.env.MONGODB_URI!, {})
        .then(() =>
            app.listen(PORT, () =>
                console.log(`Server running on port ${PORT}`)
            )
        )
        .catch((err) => console.error(err));
}
