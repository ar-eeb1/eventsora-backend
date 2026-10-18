import { Router } from "express";
import connectDB from "../../config/db.js";
import { zSchema } from "../../lib/zodSchema.js";
import { sendMail } from "../../lib/sendMail.js";
import { catchError, response } from "../../lib/helperFunction.js";
import UserModel from "../../models/User.model.js";
import { SignJWT } from "jose";
import { z } from "zod";
import { emailVerificationLink } from "../../email/emailVerificationLink.js";

const router = Router();

router.post("/register", async (req, res) => {

    try {
        await connectDB()
        const validationSchema = zSchema.pick({
            name: true,
            email: true,
            password: true,
            phone: true
        }).extend({
            role: z.string().optional()
        })

        const payload = req.body
        const validatedData = validationSchema.safeParse(payload)

        if (!validatedData.success) {
            return response(res, false, 400, 'Invalid or missing input fields', validatedData.error)
        }

        const { name, email, password, phone, role } = validatedData.data
        const checkUser = await UserModel.exists({ email })

        if (checkUser) {
            return response(res, false, 409, 'User already Registered')
        }

        const newRegisteration = new UserModel({
            name, email, password, phone, role: role || 'user'
        })

        await newRegisteration.save()

        const secret = new TextEncoder().encode(process.env.SECRET_KEY)
        const token = await new SignJWT({ userId: newRegisteration._id.toString() })
            .setIssuedAt()
            .setExpirationTime('1h')
            .setProtectedHeader({ alg: 'HS256' })
            .sign(secret)

        const frontendUrl = process.env.FRONTEND_URL || process.env.NEXT_PUBLIC_FRONTEND_URL || process.env.API_BASE_URL || 'http://localhost:3000'
        await sendMail('Email verification from Eventsora', email, emailVerificationLink(`${frontendUrl}/auth/verify-email/${token}`))

        return response(res, true, 200, 'Registration success, Verify OTP via Email')

    } catch (error) {
        return catchError(res, error)
    }
})

export default router;