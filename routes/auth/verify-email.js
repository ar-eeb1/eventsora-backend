import { Router } from "express";
import { catchError } from "../../lib/helperFunction.js";
import connectDB from "../../config/db.js";

const router = Router()

router.post("/verify-email/:token", async (req, res) => {
    try {
        await connectDB()

        const { token } = req.params;
        console.log(token);

    } catch (error) {
        return catchError(res, error)
    }
})

export default router