import { Router } from "express";
import connectDB from "../../config/db.js";
import { catchError, generateOTP, response } from "../../lib/helperFunction.js";
import { zSchema } from "../../lib/zodSchema.js";
import UserModel from "../../models/User.model.js";
import OTPModel from "../../models/Otp.model.js";
import { SignJWT } from "jose";
import { z } from "zod";
import { sendMail } from "../../lib/sendMail.js";
import { emailVerificationLink } from "../../email/emailVerificationLink.js";
import { otpEmail } from "../../email/otpEmail.js";

const router = Router();

router.post("/login", async (req, res) => {
    try {
        await connectDB();
        const payload = req.body;
        const validationSchema = zSchema.pick({
            email: true,
        }).extend({
            password: z.string()
        });

        const validatedData = validationSchema.safeParse(payload);
        if (!validatedData.success) {
            return response(res, false, 400, 'Invalid or missing fields', validatedData.error);
        }

        const { email, password } = validatedData.data;

        // GET USER
        const getUser = await UserModel.findOne({ deletedAt: null, email }).select('+password');
        if (!getUser) {
            return response(res, false, 404, 'Invalid login credentials');
        }


        // Resend email verification if user email is not verified
        if (!getUser.isEmailVerified && email !== 'demo@gmail.com') {
            const secret = new TextEncoder().encode(process.env.SECRET_KEY);
            const token = await new SignJWT({ userId: getUser._id.toString() })
                .setIssuedAt()
                .setExpirationTime('1h')
                .setProtectedHeader({ alg: 'HS256' })
                .sign(secret);

            const frontendUrl = process.env.FRONTEND_URL || process.env.NEXT_PUBLIC_FRONTEND_URL || process.env.API_BASE_URL || 'http://localhost:3000';
            await sendMail('Email verification from Eventsora', email, emailVerificationLink(`${frontendUrl}/auth/verify-email/${token}`));

            return response(res, false, 401, 'Verify your email by using registered Email.');
        }

        // Verify password
        const isPasswordVerified = await getUser.comparePassword(password);
        if (!isPasswordVerified) {
            return response(res, false, 400, 'Invalid login credentials');
        }

        // OTP generation
        await OTPModel.deleteMany({ email });
        const otp = email === 'demo@gmail.com' ? '123456' : generateOTP();

        const newOtpData = new OTPModel({
            email,
            otp
        });
        await newOtpData.save();

        if (email !== 'demo@gmail.com') {
            const otpEmailStatus = await sendMail('Login Verification Code', email, otpEmail(otp));
            if (!otpEmailStatus.success) {
                return response(res, false, 400, 'Failed to send OTP - Retry later.');
            }
        }

        return response(res, true, 200, 'Verify OTP via Email');

    } catch (error) {
        return catchError(res, error);
    }
});

export default router;