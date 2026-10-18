import { Router } from "express";
import connectDB from "../../config/db.js";
import { catchError, response } from "../../lib/helperFunction.js";
import { zSchema } from "../../lib/zodSchema.js";
import OTPModel from "../../models/Otp.model.js";
import UserModel from "../../models/User.model.js";
import { SignJWT } from "jose";

const router = Router();

router.post("/verify-otp", async (req, res) => {
    try {
        await connectDB();
        const payload = req.body;
        const validationSchema = zSchema.pick({
            email: true,
            otp: true
        });

        const validatedData = validationSchema.safeParse(payload);
        if (!validatedData.success) {
            return response(res, false, 401, 'Invalid or missing field', validatedData.error);
        }

        const { email, otp } = validatedData.data;
        const getOtpData = await OTPModel.findOne({ email, otp });
        if (!getOtpData) {
            return response(res, false, 404, 'Invalid or Expired OTP');
        }

        const getUser = await UserModel.findOne({ deletedAt: null, email }).lean();
        if (!getUser) {
            return response(res, false, 404, 'User not found');
        }

        const loggedInUserData = {
            _id: getUser._id,
            role: getUser.role,
            name: getUser.name,
            avatar: getUser.avatar,
        };

        const secret = new TextEncoder().encode(process.env.SECRET_KEY);
        const token = await new SignJWT({
            userId: getUser._id.toString(),
            role: getUser.role
        })
            .setIssuedAt()
            .setExpirationTime("3h")
            .setProtectedHeader({ alg: "HS256" })
            .sign(secret);

        res.cookie('access_token', token, {
            httpOnly: process.env.NODE_ENV === 'production',
            path: '/',
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 3 * 60 * 60 * 1000,
        });

        await getOtpData.deleteOne();

        return response(res, true, 200, 'Login Success', { ...loggedInUserData, token });
    } catch (error) {
        return catchError(res, error);
    }
});

export default router;
