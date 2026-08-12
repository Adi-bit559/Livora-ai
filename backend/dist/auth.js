"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authRouter = void 0;
exports.hashPassword = hashPassword;
exports.comparePassword = comparePassword;
exports.generateAccessToken = generateAccessToken;
exports.generateRefreshToken = generateRefreshToken;
exports.sanitizeUser = sanitizeUser;
exports.authenticateToken = authenticateToken;
exports.requireRole = requireRole;
const express_1 = require("express");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const database_1 = require("./database");
const zod_1 = require("zod");
const JWT_SECRET = process.env.JWT_SECRET || 'livora_default_secret_key_2026';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'livora_default_refresh_secret_2026';
function hashPassword(password) {
    return bcryptjs_1.default.hash(password, 10);
}
function comparePassword(password, hash) {
    return bcryptjs_1.default.compare(password, hash);
}
function generateAccessToken(payload) {
    return jsonwebtoken_1.default.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}
function generateRefreshToken(payload) {
    return jsonwebtoken_1.default.sign(payload, JWT_REFRESH_SECRET, { expiresIn: '30d' });
}
function sanitizeUser(user) {
    const { passwordHash, ...rest } = user;
    return rest;
}
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) {
        return res.status(401).json({ success: false, message: 'Authentication token required' });
    }
    try {
        const decoded = jsonwebtoken_1.default.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    }
    catch (err) {
        return res.status(403).json({ success: false, message: 'Invalid or expired token' });
    }
}
function requireRole(...roles) {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ success: false, message: 'Unauthorized' });
        }
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({ success: false, message: `Access denied. Requires one of roles: ${roles.join(', ')}` });
        }
        next();
    };
}
const registerSchema = zod_1.z.object({
    name: zod_1.z.string().min(2),
    email: zod_1.z.string().email(),
    password: zod_1.z.string().min(6),
    phone: zod_1.z.string().optional(),
    role: zod_1.z.enum(['RENTER', 'OWNER', 'ADMIN']).default('RENTER'),
    city: zod_1.z.string().optional(),
    bio: zod_1.z.string().optional(),
});
const loginSchema = zod_1.z.object({
    email: zod_1.z.string().email(),
    password: zod_1.z.string().min(1),
});
exports.authRouter = (0, express_1.Router)();
exports.authRouter.post('/register', async (req, res) => {
    try {
        const validated = registerSchema.parse(req.body);
        const existing = await database_1.prisma.user.findUnique({ where: { email: validated.email } });
        if (existing) {
            return res.status(400).json({ success: false, message: 'User with this email already exists' });
        }
        const passwordHash = await hashPassword(validated.password);
        const user = await database_1.prisma.user.create({
            data: {
                name: validated.name,
                email: validated.email,
                phone: validated.phone,
                passwordHash,
                role: validated.role,
                city: validated.city,
                bio: validated.bio,
            },
        });
        if (validated.role === 'RENTER') {
            await database_1.prisma.roommateProfile.create({
                data: {
                    userId: user.id,
                    preferredCity: validated.city || 'Mumbai',
                },
            });
        }
        if (validated.role === 'OWNER') {
            const now = new Date();
            const trialEnd = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days FREE
            await database_1.prisma.subscription.create({
                data: {
                    ownerId: user.id,
                    plan: 'TRIAL',
                    price: 0,
                    status: 'TRIAL',
                    trialStart: now,
                    trialEnd: trialEnd,
                    startDate: now,
                    endDate: trialEnd,
                    autoRenew: true,
                },
            });
        }
        const tokenPayload = { id: user.id, email: user.email, role: user.role, name: user.name };
        const accessToken = generateAccessToken(tokenPayload);
        const refreshToken = generateRefreshToken({ id: user.id });
        return res.status(201).json({
            success: true,
            message: 'Registration successful',
            data: {
                user: sanitizeUser(user),
                accessToken,
                refreshToken,
            },
        });
    }
    catch (error) {
        return res.status(400).json({ success: false, message: error.message || 'Registration failed' });
    }
});
exports.authRouter.post('/login', async (req, res) => {
    try {
        const validated = loginSchema.parse(req.body);
        const user = await database_1.prisma.user.findUnique({ where: { email: validated.email } });
        if (!user) {
            return res.status(401).json({ success: false, message: 'Invalid email or password' });
        }
        const isValid = await comparePassword(validated.password, user.passwordHash);
        if (!isValid) {
            return res.status(401).json({ success: false, message: 'Invalid email or password' });
        }
        const tokenPayload = { id: user.id, email: user.email, role: user.role, name: user.name };
        const accessToken = generateAccessToken(tokenPayload);
        const refreshToken = generateRefreshToken({ id: user.id });
        return res.json({
            success: true,
            message: 'Login successful',
            data: {
                user: sanitizeUser(user),
                accessToken,
                refreshToken,
            },
        });
    }
    catch (error) {
        return res.status(400).json({ success: false, message: error.message || 'Login failed' });
    }
});
exports.authRouter.post('/logout', (req, res) => {
    return res.json({ success: true, message: 'Logged out successfully' });
});
exports.authRouter.get('/me', authenticateToken, async (req, res) => {
    try {
        const user = await database_1.prisma.user.findUnique({
            where: { id: req.user.id },
            include: {
                roommateProfile: true,
                subscriptions: { orderBy: { createdAt: 'desc' }, take: 1 },
            },
        });
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }
        return res.json({
            success: true,
            data: sanitizeUser(user),
        });
    }
    catch (error) {
        return res.status(500).json({ success: false, message: 'Failed to fetch user profile' });
    }
});
exports.authRouter.post('/refresh', async (req, res) => {
    const { refreshToken } = req.body;
    if (!refreshToken) {
        return res.status(400).json({ success: false, message: 'Refresh token required' });
    }
    try {
        const decoded = jsonwebtoken_1.default.verify(refreshToken, JWT_REFRESH_SECRET);
        const user = await database_1.prisma.user.findUnique({ where: { id: decoded.id } });
        if (!user) {
            return res.status(401).json({ success: false, message: 'User not found' });
        }
        const tokenPayload = { id: user.id, email: user.email, role: user.role, name: user.name };
        const newAccessToken = generateAccessToken(tokenPayload);
        return res.json({
            success: true,
            data: { accessToken: newAccessToken },
        });
    }
    catch (err) {
        return res.status(403).json({ success: false, message: 'Invalid refresh token' });
    }
});
