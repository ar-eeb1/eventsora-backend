import { jwtVerify } from "jose";
import connectDB from "../config/db.js";
import UserModel from "../models/User.model.js";

const parseCookies = (cookieHeader) => {
    const list = {};
    if (!cookieHeader) return list;
    cookieHeader.split(';').forEach(cookie => {
        let [name, ...rest] = cookie.split('=');
        name = name?.trim();
        if (!name) return;
        const value = rest.join('=').trim();
        list[name] = decodeURIComponent(value);
    });
    return list;
};

// For Express request & multiple roles
export const isAuthenticated = async (req, roles) => {
    try {
        // Support passing req directly, or fallback if roles is first param
        let reqObj = req;
        let roleList = roles;

        if (typeof req === 'string' || Array.isArray(req)) {
            roleList = req;
            reqObj = null;
        }

        const cookieHeader = reqObj?.headers?.cookie;
        const cookies = parseCookies(cookieHeader);
        const token = reqObj?.cookies?.access_token || cookies["access_token"] || reqObj?.headers?.authorization?.replace("Bearer ", "");

        if (!token) return { isAuth: false };

        const secret = new TextEncoder().encode(process.env.SECRET_KEY);
        const { payload } = await jwtVerify(token, secret);

        const allowedRoles = Array.isArray(roleList) ? roleList : [roleList];

        if (roleList && !allowedRoles.includes(payload.role)) return { isAuth: false };

        await connectDB();
        const user = await UserModel.findById(payload.userId).select('expireAt');

        if (user && user.expireAt && new Date() > new Date(user.expireAt)) {
            return { isAuth: true, userId: payload.userId, role: payload.role, isExpired: true };
        }

        return { isAuth: true, userId: payload.userId, role: payload.role, isExpired: false };
    } catch (error) {
        return { isAuth: false, error };
    }
};

