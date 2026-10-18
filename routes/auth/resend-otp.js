import { Router } from "express";
import connectDB from "../../config/db";
import { zSchema } from "../../lib/zodSchema";
import { catchError, generateOTP, response } from "../../lib/helperFunction";
import UserModel from "../../models/User.model";
import OTPModel from "../../models/Otp.model";
import { sendMail } from "../../lib/sendMail";
import { otpEmail } from "../../email/otpEmail";

const router = Router()
router.post("/resend-otp", async (req, res) => {
    try {
        const payload = req.body
        const validationSchema = zSchema.pick({ email: true })
        const validatedData = validationSchema.safeParse(payload)
        if (!validatedData) {
            return response(res, false, 400, 'Invalid or missing fields', validatedData.error)
        }
        const { email } = validatedData.data
        const getUser = await UserModel.findOne({ email })
        if (!getUser) {
            return response(res, false, 404, 'User not found')
        }

        // REMOVE OLD OTPS 
        await OTPModel.deleteMany({ email })
        const otp = email === 'demo@gmail.com' ? '123456' : generateOTP()
        const newOtpData = new OTPModel({
            email, otp
        })
        await newOtpData.save()

        if (email !== 'demo@gmail.com') {
            const otpSendStatus = await sendMail('Login Verification Code', email, otpEmail(otp))
        }

        return response(res, true, 200, 'OTP Send Successfully')
    } catch (error) {
        return catchError(res, error)
    }
})
