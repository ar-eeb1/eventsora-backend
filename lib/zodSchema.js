import z from "zod";
import { dateStatus } from "./utils.js";

export const zSchema = z.object({
    name: z.string()
        .min(3, "Full name must be at least 3 characters")
        .max(50, "Full name must be less than 50 characters"),
    email: z
        .string()
        .min(1, "Email is required")
        .email("Invalid email address"),

    password: z
        .string()
        .min(8, "Password must be at least 8 characters long")
        .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
        .regex(/[a-z]/, "Password must contain at least one lowercase letter")
        .regex(/[0-9]/, "Password must contain at least one number")
        .regex(/[@$!%*?&]/, "Password must contain at least one special character (@$!%*?&)"),
    otp: z
        .string()
        .length(6, "OTP must be exactly 6 digits")
        .regex(/^\d{6}$/, "OTP must contain only numbers"),
    phone: z.string()
        .regex(/^03[0-9]{9}$/, "Invalid mobile number. Format: 03XXXXXXXXX"),
    category: z.string().min(3, "Category should contain at least 3 letters"),
    subcategory: z.string().min(3, "Sub Category should contain at least 3 letters"),
    slug: z.string().min(3, "Slug is required"),
    _id: z.string().min(3, "Id is required"),
    country: z.string().min(3, "Country should contain at least 3 letters"),
    state: z.string().min(3, "State should contain at least 3 letters"),
    city: z.string().min(3, "City should contain at least 3 letters"),
    address: z.string().min(3, "Address should contain at least 3 letters"),
    locality: z.string().optional(),
    status: z.string().min(3, "Status should contain at least 3 letters"),
    // dateStatus: z.enum(dateStatus),
    sublocality: z.string().nullable().optional(),
    serviceCode: z.string().min(3, "Service Code required"),
    description: z.string().min(10, "Description required"),
    listing: z.string().min(1, "Listing required"),
    title: z.string().min(1, "Title required"),
    listingId: z.string().min(1, 'Select listing'),
    userId: z.string().min(1, 'User Id required'),
    code: z.string().min(1, "Country Code should contain at least 1 letter"),
    role: z.string().min(1, "Required"),
    review: z.string().min(10, "Review must be at least 10 characters long"),
    pricingType: z.string().min(1, "Required"),
    adminNote: z.string().optional(),
    note: z.string().optional(),
    media: z.array(z.string()),
    tags: z.array(z.string()).optional(),
    listingType: z.string().optional(),
    inquirePrice: z.boolean().optional(),
    availability: z.object({
        monday: z.boolean().optional(),
        tuesday: z.boolean().optional(),
        wednesday: z.boolean().optional(),
        thursday: z.boolean().optional(),
        friday: z.boolean().optional(),
        saturday: z.boolean().optional(),
        sunday: z.boolean().optional(),
    }).optional(),
    expire: z.string().nullable().optional(),

    minPersons: z.coerce.number().min(0),
    price: z.coerce.number().min(0),
    startingPrice: z.coerce.number().min(0),
    points: z.array(z.string()).optional(),
    capacity: z.coerce.number().min(0).optional(),
    // date: z.coerce.date(),
    variantId: z.string().optional(),
    rating: z.union([
        z.number().positive('Expected positive number'),
        z.string().transform((val) => Number(val)).refine((val) => !isNaN(val) && val > 0, 'Expected positive number')
    ]),
    amount: z.union([
        z.number().positive('Expected positive number'),
        z.string().transform((val) => Number(val)).refine((val) => !isNaN(val) && val > 0, 'Expected positive number')
    ])
});