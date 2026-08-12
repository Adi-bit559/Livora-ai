"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.apiRouter = void 0;
exports.processDemoPayment = processDemoPayment;
exports.checkOwnerSubscriptionLimit = checkOwnerSubscriptionLimit;
const express_1 = require("express");
const database_1 = require("./database");
const auth_1 = require("./auth");
const ai_1 = require("./ai");
exports.apiRouter = (0, express_1.Router)();
// ==========================================
// 0. HEALTH CHECK (Section 58)
// ==========================================
exports.apiRouter.get('/health', async (req, res) => {
    try {
        await database_1.prisma.$queryRaw `SELECT 1`;
        return res.json({
            status: 'ok',
            database: 'connected',
            application: 'Livora AI',
        });
    }
    catch (error) {
        return res.status(500).json({
            status: 'error',
            database: 'disconnected',
            application: 'Livora AI',
        });
    }
});
// Generic Demo Payment Function (Section 84 & 107)
async function processDemoPayment(userId, type, amount, referenceId, description) {
    return await database_1.prisma.transaction.create({
        data: {
            userId,
            type,
            referenceId,
            amount,
            status: 'SUCCESS',
            description,
        },
    });
}
// Helper: Owner Subscription Access Control & Limits (Sections 69 & 73)
async function checkOwnerSubscriptionLimit(ownerId) {
    let sub = await database_1.prisma.subscription.findFirst({
        where: { ownerId },
        orderBy: { createdAt: 'desc' },
    });
    const now = new Date();
    // Auto-expire trial or subscription if past end date
    if (sub && sub.endDate < now && sub.status !== 'EXPIRED' && sub.status !== 'CANCELLED') {
        sub = await database_1.prisma.subscription.update({
            where: { id: sub.id },
            data: { status: 'EXPIRED' },
        });
    }
    // Auto-assign trial if no subscription exists
    if (!sub) {
        const trialEnd = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
        sub = await database_1.prisma.subscription.create({
            data: {
                ownerId,
                plan: 'TRIAL',
                price: 0,
                status: 'TRIAL',
                trialStart: now,
                trialEnd: trialEnd,
                startDate: now,
                endDate: trialEnd,
            },
        });
    }
    if (sub.status === 'EXPIRED') {
        return {
            allowed: false,
            message: 'Your Livora subscription has expired. Renew to continue listing and receiving new bookings.',
            plan: sub.plan,
        };
    }
    const limit = sub.plan === 'PRO' ? 10 : 2;
    const activeCount = await database_1.prisma.property.count({
        where: { ownerId, isDemoListing: false },
    });
    if (activeCount >= limit) {
        return {
            allowed: false,
            message: `Property limit reached (${activeCount}/${limit}). Upgrade your Livora plan to add more properties.`,
            plan: sub.plan,
        };
    }
    return { allowed: true, plan: sub.plan };
}
// ==========================================
// 1. PROPERTIES & SEARCH APIs
// ==========================================
exports.apiRouter.get('/properties', async (req, res) => {
    try {
        const page = Math.max(1, parseInt(req.query.page) || 1);
        const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
        const skip = (page - 1) * limit;
        const { city, state, locality, minRent, maxRent, propertyType, ac, furnished, powerBackup, food, wifi, verified, minTrustScore, minRating, sort, } = req.query;
        const where = {};
        if (city)
            where.city = { contains: city };
        if (state)
            where.state = { contains: state };
        if (locality)
            where.locality = { contains: locality };
        if (minRent || maxRent) {
            where.monthlyRentFrom = {};
            if (minRent)
                where.monthlyRentFrom.gte = parseInt(minRent);
            if (maxRent)
                where.monthlyRentFrom.lte = parseInt(maxRent);
        }
        if (propertyType) {
            where.propertyType = propertyType;
        }
        if (ac === 'true') {
            where.rooms = { some: { ac: true } };
        }
        if (food === 'true') {
            where.foodAvailable = true;
        }
        if (powerBackup === 'true') {
            where.powerBackup = true;
        }
        if (furnished) {
            where.furnished = furnished;
        }
        if (verified === 'true') {
            where.OR = [{ isVerified: true }, { verificationStatus: 'VERIFIED' }];
        }
        if (minTrustScore) {
            where.trustScore = { gte: parseInt(minTrustScore) };
        }
        if (minRating) {
            where.rating = { gte: parseFloat(minRating) };
        }
        if (wifi === 'true') {
            where.amenities = { some: { name: { contains: 'WiFi' } } };
        }
        let orderBy = { createdAt: 'desc' };
        if (sort === 'rent_asc')
            orderBy = { monthlyRentFrom: 'asc' };
        if (sort === 'rent_desc')
            orderBy = { monthlyRentFrom: 'desc' };
        if (sort === 'trust_score')
            orderBy = { trustScore: 'desc' };
        if (sort === 'rating')
            orderBy = { rating: 'desc' };
        const [total, properties] = await Promise.all([
            database_1.prisma.property.count({ where }),
            database_1.prisma.property.findMany({
                where,
                skip,
                take: limit,
                orderBy,
                include: {
                    rooms: true,
                    amenities: true,
                    owner: {
                        select: { id: true, name: true, email: true, phone: true, profileImage: true, phoneVerified: true, emailVerified: true },
                    },
                },
            }),
        ]);
        return res.json({
            success: true,
            data: properties,
            meta: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        });
    }
    catch (error) {
        return res.status(500).json({ success: false, message: error.message || 'Failed to fetch properties' });
    }
});
exports.apiRouter.get('/properties/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const property = await database_1.prisma.property.findUnique({
            where: { id },
            include: {
                rooms: true,
                amenities: true,
                reviews: {
                    include: {
                        user: { select: { id: true, name: true, profileImage: true } },
                    },
                    orderBy: { createdAt: 'desc' },
                    take: 10,
                },
                owner: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        phone: true,
                        profileImage: true,
                        emailVerified: true,
                        phoneVerified: true,
                    },
                },
            },
        });
        if (!property) {
            return res.status(404).json({ success: false, message: 'Property not found' });
        }
        const calculatedTrustScore = (0, ai_1.calculatePropertyTrustScore)(property);
        const vacancy = (0, ai_1.predictPropertyVacancy)(property);
        const roommates = await database_1.prisma.roommateProfile.findMany({
            where: { preferredCity: { contains: property.city } },
            take: 4,
            include: {
                user: { select: { id: true, name: true, profileImage: true, city: true } },
            },
        });
        return res.json({
            success: true,
            data: {
                ...property,
                trustScore: calculatedTrustScore,
                vacancyPrediction: vacancy,
                roommates,
            },
        });
    }
    catch (error) {
        return res.status(500).json({ success: false, message: 'Failed to fetch property details' });
    }
});
exports.apiRouter.post('/properties', auth_1.authenticateToken, (0, auth_1.requireRole)('OWNER', 'ADMIN'), async (req, res) => {
    try {
        const ownerId = req.user.id;
        // Verify Owner Subscription Limit if not ADMIN
        if (req.user.role !== 'ADMIN') {
            const check = await checkOwnerSubscriptionLimit(ownerId);
            if (!check.allowed) {
                return res.status(403).json({ success: false, message: check.message });
            }
        }
        const data = req.body;
        const property = await database_1.prisma.property.create({
            data: {
                ownerId,
                title: data.title,
                description: data.description || '',
                propertyType: data.propertyType || 'PG',
                address: data.address,
                locality: data.locality,
                city: data.city,
                state: data.state || 'Maharashtra',
                pincode: data.pincode || '400001',
                latitude: data.latitude ? parseFloat(data.latitude) : 19.0760,
                longitude: data.longitude ? parseFloat(data.longitude) : 72.8777,
                monthlyRentFrom: parseInt(data.monthlyRentFrom),
                monthlyRentTo: parseInt(data.monthlyRentTo || data.monthlyRentFrom),
                securityDeposit: parseInt(data.securityDeposit || 0),
                genderPreference: data.genderPreference || 'ANY',
                foodAvailable: data.foodAvailable === true || data.foodAvailable === 'true',
                furnished: data.furnished || 'SEMI',
                powerBackup: data.powerBackup !== false,
                isVerified: false,
                verificationStatus: 'PENDING',
                isDemoListing: false,
                dataSource: 'OWNER',
                amenities: {
                    create: (data.amenities || ['WiFi', 'Power Backup', 'AC']).map((name) => ({ name })),
                },
                rooms: {
                    create: data.rooms || [
                        {
                            roomNumber: '101',
                            roomType: 'SINGLE',
                            sharingType: 'Single Occupancy',
                            monthlyRent: parseInt(data.monthlyRentFrom),
                            securityDeposit: parseInt(data.securityDeposit || 0),
                            ac: true,
                            totalBeds: 1,
                            occupiedBeds: 0,
                        },
                    ],
                },
            },
            include: { rooms: true, amenities: true },
        });
        await database_1.prisma.verification.create({
            data: {
                propertyId: property.id,
                ownerId,
                status: 'PENDING',
            },
        });
        return res.status(201).json({ success: true, data: property });
    }
    catch (error) {
        return res.status(400).json({ success: false, message: error.message || 'Failed to create property' });
    }
});
// ==========================================
// 2. OWNER SUBSCRIPTION & MANAGEMENT APIs
// ==========================================
exports.apiRouter.get('/owner/subscription', auth_1.authenticateToken, (0, auth_1.requireRole)('OWNER', 'ADMIN'), async (req, res) => {
    try {
        const ownerId = req.user.id;
        let sub = await database_1.prisma.subscription.findFirst({
            where: { ownerId },
            orderBy: { createdAt: 'desc' },
        });
        const now = new Date();
        if (!sub) {
            const trialEnd = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
            sub = await database_1.prisma.subscription.create({
                data: {
                    ownerId,
                    plan: 'TRIAL',
                    price: 0,
                    status: 'TRIAL',
                    trialStart: now,
                    trialEnd: trialEnd,
                    startDate: now,
                    endDate: trialEnd,
                },
            });
        }
        const propertiesCount = await database_1.prisma.property.count({
            where: { ownerId, isDemoListing: false },
        });
        const limit = sub.plan === 'PRO' ? 10 : 2;
        const daysRemaining = Math.max(0, Math.ceil((new Date(sub.endDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
        return res.json({
            success: true,
            data: {
                ...sub,
                propertiesUsed: propertiesCount,
                propertiesLimit: limit,
                daysRemaining,
            },
        });
    }
    catch (error) {
        return res.status(500).json({ success: false, message: 'Failed to fetch subscription status' });
    }
});
exports.apiRouter.post('/owner/subscription/subscribe', auth_1.authenticateToken, (0, auth_1.requireRole)('OWNER', 'ADMIN'), async (req, res) => {
    try {
        const { plan } = req.body; // BASIC (₹99) or PRO (₹199)
        if (!['BASIC', 'PRO'].includes(plan)) {
            return res.status(400).json({ success: false, message: 'Invalid subscription plan' });
        }
        const ownerId = req.user.id;
        const price = plan === 'PRO' ? 199 : 99;
        const now = new Date();
        const endDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days
        // Create Subscription
        const sub = await database_1.prisma.subscription.create({
            data: {
                ownerId,
                plan,
                price,
                status: 'ACTIVE',
                startDate: now,
                endDate: endDate,
                trialStart: now,
                trialEnd: now,
                autoRenew: true,
            },
        });
        // Create Demo Transaction
        await processDemoPayment(ownerId, 'SUBSCRIPTION', price, sub.id, `Livora ${plan} Owner Subscription (₹${price}/mo - Demo Transaction)`);
        return res.json({
            success: true,
            message: `Successfully subscribed to Livora ${plan} Plan (₹${price}/mo)`,
            data: sub,
        });
    }
    catch (error) {
        return res.status(500).json({ success: false, message: 'Subscription activation failed' });
    }
});
exports.apiRouter.post('/owner/subscription/cancel-auto-renew', auth_1.authenticateToken, (0, auth_1.requireRole)('OWNER', 'ADMIN'), async (req, res) => {
    try {
        const ownerId = req.user.id;
        const sub = await database_1.prisma.subscription.findFirst({
            where: { ownerId, status: 'ACTIVE' },
            orderBy: { createdAt: 'desc' },
        });
        if (!sub)
            return res.status(404).json({ success: false, message: 'No active subscription found' });
        const updated = await database_1.prisma.subscription.update({
            where: { id: sub.id },
            data: { autoRenew: false },
        });
        return res.json({ success: true, message: 'Auto-renewal cancelled. Subscription will remain active until end date.', data: updated });
    }
    catch (error) {
        return res.status(500).json({ success: false, message: 'Failed to cancel auto-renewal' });
    }
});
exports.apiRouter.get('/owner/analytics', auth_1.authenticateToken, (0, auth_1.requireRole)('OWNER', 'ADMIN'), async (req, res) => {
    try {
        const ownerId = req.user.id;
        const properties = await database_1.prisma.property.findMany({
            where: { ownerId },
            include: { rooms: true, bookings: true },
        });
        let totalRooms = 0;
        let occupiedBeds = 0;
        let totalBeds = 0;
        let monthlyRevenue = 0;
        properties.forEach((p) => {
            p.rooms.forEach((r) => {
                totalRooms++;
                totalBeds += r.totalBeds;
                occupiedBeds += r.occupiedBeds;
                monthlyRevenue += r.occupiedBeds * r.monthlyRent;
            });
        });
        const totalBookings = await database_1.prisma.booking.count({
            where: { property: { ownerId } },
        });
        const occupancyRate = totalBeds > 0 ? Number(((occupiedBeds / totalBeds) * 100).toFixed(1)) : 0;
        return res.json({
            success: true,
            data: {
                totalProperties: properties.length,
                totalRooms,
                totalBeds,
                availableBeds: totalBeds - occupiedBeds,
                occupancyRate,
                monthlyRevenue,
                totalBookings,
                averageRating: 4.8,
                trustScore: 88,
            },
        });
    }
    catch (error) {
        return res.status(500).json({ success: false, message: 'Failed to fetch owner analytics' });
    }
});
// ==========================================
// 3. ADMIN VERIFICATION & REVENUE APIs
// ==========================================
exports.apiRouter.get('/admin/verifications', auth_1.authenticateToken, (0, auth_1.requireRole)('ADMIN'), async (req, res) => {
    try {
        const verifications = await database_1.prisma.verification.findMany({
            where: { status: 'PENDING' },
            include: {
                property: true,
                owner: { select: { id: true, name: true, email: true, phone: true } },
            },
        });
        return res.json({ success: true, data: verifications });
    }
    catch (error) {
        return res.status(500).json({ success: false, message: 'Failed to fetch verifications' });
    }
});
exports.apiRouter.patch('/admin/properties/:id/verify', auth_1.authenticateToken, (0, auth_1.requireRole)('ADMIN'), async (req, res) => {
    try {
        const { id } = req.params;
        const updated = await database_1.prisma.property.update({
            where: { id },
            data: {
                isVerified: true,
                verificationStatus: 'VERIFIED',
                trustScore: 92,
            },
        });
        await database_1.prisma.verification.updateMany({
            where: { propertyId: id },
            data: { status: 'VERIFIED', reviewedByAdminId: req.user.id },
        });
        return res.json({ success: true, message: 'Property verified successfully', data: updated });
    }
    catch (error) {
        return res.status(500).json({ success: false, message: 'Failed to verify property' });
    }
});
exports.apiRouter.patch('/admin/properties/:id/reject', auth_1.authenticateToken, (0, auth_1.requireRole)('ADMIN'), async (req, res) => {
    try {
        const { id } = req.params;
        const updated = await database_1.prisma.property.update({
            where: { id },
            data: {
                isVerified: false,
                verificationStatus: 'REJECTED',
            },
        });
        await database_1.prisma.verification.updateMany({
            where: { propertyId: id },
            data: { status: 'REJECTED', reviewedByAdminId: req.user.id },
        });
        return res.json({ success: true, message: 'Property verification rejected', data: updated });
    }
    catch (error) {
        return res.status(500).json({ success: false, message: 'Failed to reject property' });
    }
});
exports.apiRouter.get('/admin/revenue', auth_1.authenticateToken, (0, auth_1.requireRole)('ADMIN'), async (req, res) => {
    try {
        const subTransactions = await database_1.prisma.transaction.aggregate({
            where: { type: 'SUBSCRIPTION', status: 'SUCCESS' },
            _sum: { amount: true },
        });
        const bookingFinancials = await database_1.prisma.bookingFinancial.aggregate({
            where: { status: 'SUCCESS' },
            _sum: { platformFee: true },
        });
        const subscriptionRevenue = subTransactions._sum.amount || 0;
        const bookingFeeRevenue = bookingFinancials._sum.platformFee || 0;
        const totalRevenue = subscriptionRevenue + bookingFeeRevenue;
        const [activeSubscribers, trialOwners, basicSubscribers, proSubscribers] = await Promise.all([
            database_1.prisma.subscription.count({ where: { status: 'ACTIVE' } }),
            database_1.prisma.subscription.count({ where: { status: 'TRIAL' } }),
            database_1.prisma.subscription.count({ where: { plan: 'BASIC', status: 'ACTIVE' } }),
            database_1.prisma.subscription.count({ where: { plan: 'PRO', status: 'ACTIVE' } }),
        ]);
        return res.json({
            success: true,
            data: {
                subscriptionRevenue,
                bookingFeeRevenue,
                totalRevenue,
                activeSubscribers,
                trialOwners,
                basicSubscribers,
                proSubscribers,
            },
        });
    }
    catch (error) {
        return res.status(500).json({ success: false, message: 'Failed to fetch revenue analytics' });
    }
});
// ==========================================
// 4. BOOKINGS & PRE-BOOKING SYSTEM
// ==========================================
exports.apiRouter.post('/bookings', auth_1.authenticateToken, async (req, res) => {
    try {
        const { propertyId, roomId, moveInDate, duration = 11 } = req.body;
        const renterId = req.user.id;
        // Transaction safety to prevent double booking
        const result = await database_1.prisma.$transaction(async (tx) => {
            const room = await tx.room.findUnique({
                where: { id: roomId },
                include: { property: true },
            });
            if (!room || !room.available || room.occupiedBeds >= room.totalBeds) {
                throw new Error('Selected room/bed is no longer available');
            }
            // Reusable 2% platform fee on monthly rent only (Sections 74, 75, 76)
            const platformFee = (0, ai_1.calculatePlatformFee)(room.monthlyRent);
            const totalAmount = room.monthlyRent + room.securityDeposit + platformFee;
            const booking = await tx.booking.create({
                data: {
                    renterId,
                    propertyId,
                    roomId,
                    moveInDate: new Date(moveInDate || Date.now()),
                    duration: parseInt(duration),
                    monthlyRent: room.monthlyRent,
                    securityDeposit: room.securityDeposit,
                    platformFee,
                    brokerage: 0, // ₹0 Brokerage
                    totalAmount,
                    status: 'CONFIRMED',
                },
            });
            // Update room occupancy
            const newOccupied = room.occupiedBeds + 1;
            await tx.room.update({
                where: { id: roomId },
                data: {
                    occupiedBeds: newOccupied,
                    available: newOccupied < room.totalBeds,
                },
            });
            // Create Booking Financial Record (Section 77, 83)
            await tx.bookingFinancial.create({
                data: {
                    bookingId: booking.id,
                    rentAmount: room.monthlyRent,
                    platformFee,
                    brokerage: 0,
                    securityDeposit: room.securityDeposit,
                    totalAmount,
                    status: 'SUCCESS',
                },
            });
            // Demo transaction for platform fee revenue
            await tx.transaction.create({
                data: {
                    userId: renterId,
                    type: 'BOOKING',
                    referenceId: booking.id,
                    amount: platformFee,
                    status: 'SUCCESS',
                    description: `Livora 2% Platform Fee for ${room.property.title} (Demo Transaction)`,
                },
            });
            // Notification
            await tx.notification.create({
                data: {
                    userId: room.property.ownerId,
                    title: 'New Confirmed Booking',
                    message: `Room ${room.roomNumber} booked at ${room.property.title}. Rent: ₹${room.monthlyRent.toLocaleString()}, Platform Fee: ₹${platformFee}. Brokerage: ₹0.`,
                    type: 'BOOKING',
                },
            });
            return booking;
        });
        return res.status(201).json({
            success: true,
            message: 'Booking confirmed with ₹0 Brokerage & 2% Platform Fee!',
            data: result,
        });
    }
    catch (error) {
        return res.status(400).json({ success: false, message: error.message || 'Booking failed' });
    }
});
exports.apiRouter.get('/bookings', auth_1.authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const role = req.user.role;
        const where = role === 'OWNER' ? { property: { ownerId: userId } } : { renterId: userId };
        const bookings = await database_1.prisma.booking.findMany({
            where,
            include: {
                property: true,
                room: true,
                renter: { select: { id: true, name: true, email: true, phone: true } },
                financialRecord: true,
            },
            orderBy: { createdAt: 'desc' },
        });
        return res.json({ success: true, data: bookings });
    }
    catch (error) {
        return res.status(500).json({ success: false, message: 'Failed to fetch bookings' });
    }
});
// ==========================================
// 5. SAVED & COMPARE & REVIEWS & ROOMMATES
// ==========================================
exports.apiRouter.post('/saved/:propertyId', auth_1.authenticateToken, async (req, res) => {
    try {
        const saved = await database_1.prisma.savedProperty.create({
            data: {
                userId: req.user.id,
                propertyId: req.params.propertyId,
            },
        });
        return res.status(201).json({ success: true, data: saved });
    }
    catch (error) {
        return res.status(400).json({ success: false, message: 'Property already saved' });
    }
});
exports.apiRouter.delete('/saved/:propertyId', auth_1.authenticateToken, async (req, res) => {
    try {
        await database_1.prisma.savedProperty.deleteMany({
            where: {
                userId: req.user.id,
                propertyId: req.params.propertyId,
            },
        });
        return res.json({ success: true, message: 'Removed from saved properties' });
    }
    catch (error) {
        return res.status(500).json({ success: false, message: 'Failed to remove saved property' });
    }
});
exports.apiRouter.get('/saved', auth_1.authenticateToken, async (req, res) => {
    try {
        const saved = await database_1.prisma.savedProperty.findMany({
            where: { userId: req.user.id },
            include: { property: { include: { rooms: true } } },
        });
        return res.json({ success: true, data: saved.map((s) => s.property) });
    }
    catch (error) {
        return res.status(500).json({ success: false, message: 'Failed to fetch saved properties' });
    }
});
exports.apiRouter.post('/compare', async (req, res) => {
    try {
        const { propertyIds } = req.body;
        if (!Array.isArray(propertyIds) || propertyIds.length === 0) {
            return res.status(400).json({ success: false, message: 'Provide array of propertyIds' });
        }
        const properties = await database_1.prisma.property.findMany({
            where: { id: { in: propertyIds.slice(0, 4) } },
            include: { rooms: true, amenities: true },
        });
        const comparisonData = properties.map((p) => ({
            ...p,
            vacancyPrediction: (0, ai_1.predictPropertyVacancy)(p),
        }));
        return res.json({ success: true, data: comparisonData });
    }
    catch (error) {
        return res.status(500).json({ success: false, message: 'Failed to generate property comparison' });
    }
});
exports.apiRouter.post('/reviews', auth_1.authenticateToken, async (req, res) => {
    try {
        const { propertyId, rating, comment, cleanliness, location, safety, ownerBehaviour, amenities, valueForMoney, listingAccuracy } = req.body;
        const review = await database_1.prisma.review.create({
            data: {
                propertyId,
                userId: req.user.id,
                rating: parseFloat(rating),
                comment: comment || '',
                cleanliness: parseInt(cleanliness || 5),
                location: parseInt(location || 5),
                safety: parseInt(safety || 5),
                ownerBehaviour: parseInt(ownerBehaviour || 5),
                amenities: parseInt(amenities || 5),
                valueForMoney: parseInt(valueForMoney || 5),
                listingAccuracy: parseInt(listingAccuracy || 5),
            },
        });
        const stats = await database_1.prisma.review.aggregate({
            where: { propertyId },
            _avg: { rating: true },
            _count: { id: true },
        });
        await database_1.prisma.property.update({
            where: { id: propertyId },
            data: {
                rating: Number((stats._avg.rating || 4.5).toFixed(1)),
                reviewCount: stats._count.id,
            },
        });
        return res.status(201).json({ success: true, data: review });
    }
    catch (error) {
        return res.status(400).json({ success: false, message: 'Failed to submit review' });
    }
});
exports.apiRouter.get('/roommates', async (req, res) => {
    try {
        const { city, budget } = req.query;
        const where = {};
        if (city)
            where.preferredCity = { contains: city };
        if (budget)
            where.budgetMax = { gte: parseInt(budget) };
        const roommates = await database_1.prisma.roommateProfile.findMany({
            where,
            take: 30,
            include: {
                user: { select: { id: true, name: true, email: true, phone: true, profileImage: true, city: true, bio: true } },
            },
        });
        return res.json({ success: true, data: roommates });
    }
    catch (error) {
        return res.status(500).json({ success: false, message: 'Failed to fetch roommate profiles' });
    }
});
exports.apiRouter.get('/roommates/matches', auth_1.authenticateToken, async (req, res) => {
    try {
        const currentProfile = await database_1.prisma.roommateProfile.findUnique({
            where: { userId: req.user.id },
        });
        const allProfiles = await database_1.prisma.roommateProfile.findMany({
            where: { userId: { not: req.user.id } },
            take: 20,
            include: {
                user: { select: { id: true, name: true, profileImage: true, city: true, bio: true } },
            },
        });
        const matches = allProfiles.map((p) => {
            const match = (0, ai_1.calculateRoommateMatch)(currentProfile || {}, p);
            return {
                roommate: p,
                ...match,
            };
        }).sort((a, b) => b.matchScore - a.matchScore);
        return res.json({ success: true, data: matches });
    }
    catch (error) {
        return res.status(500).json({ success: false, message: 'Failed to calculate roommate matches' });
    }
});
exports.apiRouter.get('/recommendations', async (req, res) => {
    try {
        const { city, budget } = req.query;
        const where = {};
        if (city)
            where.city = { contains: city };
        if (budget)
            where.monthlyRentFrom = { lte: parseInt(budget) };
        const properties = await database_1.prisma.property.findMany({
            where,
            take: 15,
            include: { rooms: true, amenities: true },
        });
        const ranked = (0, ai_1.rankPropertyRecommendations)(properties, { preferredCity: city, budgetMax: budget ? parseInt(budget) : 25000 });
        return res.json({ success: true, data: ranked });
    }
    catch (error) {
        return res.status(500).json({ success: false, message: 'Failed to generate recommendations' });
    }
});
// ==========================================
// 6. DASHBOARDS & MESSAGING & NOTIFICATIONS
// ==========================================
exports.apiRouter.get('/dashboard/renter', auth_1.authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const [bookings, saved, notifications, recommendations] = await Promise.all([
            database_1.prisma.booking.findMany({
                where: { renterId: userId },
                include: { property: true, room: true, financialRecord: true },
            }),
            database_1.prisma.savedProperty.findMany({
                where: { userId },
                include: { property: true },
            }),
            database_1.prisma.notification.findMany({
                where: { userId },
                take: 10,
                orderBy: { createdAt: 'desc' },
            }),
            database_1.prisma.property.findMany({ take: 6, include: { rooms: true } }),
        ]);
        return res.json({
            success: true,
            data: {
                bookings,
                savedProperties: saved.map((s) => s.property),
                notifications,
                recommendations: (0, ai_1.rankPropertyRecommendations)(recommendations),
            },
        });
    }
    catch (error) {
        return res.status(500).json({ success: false, message: 'Failed to load renter dashboard' });
    }
});
exports.apiRouter.get('/dashboard/owner', auth_1.authenticateToken, (0, auth_1.requireRole)('OWNER', 'ADMIN'), async (req, res) => {
    try {
        const ownerId = req.user.id;
        const [properties, bookings, notifications, sub] = await Promise.all([
            database_1.prisma.property.findMany({
                where: { ownerId },
                include: { rooms: true, verifications: true },
            }),
            database_1.prisma.booking.findMany({
                where: { property: { ownerId } },
                include: { renter: { select: { name: true, email: true, phone: true } }, property: true, room: true },
            }),
            database_1.prisma.notification.findMany({
                where: { userId: ownerId },
                take: 10,
                orderBy: { createdAt: 'desc' },
            }),
            database_1.prisma.subscription.findFirst({
                where: { ownerId },
                orderBy: { createdAt: 'desc' },
            }),
        ]);
        return res.json({
            success: true,
            data: {
                properties,
                bookings,
                notifications,
                subscription: sub,
            },
        });
    }
    catch (error) {
        return res.status(500).json({ success: false, message: 'Failed to load owner dashboard' });
    }
});
exports.apiRouter.get('/messages', auth_1.authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const messages = await database_1.prisma.message.findMany({
            where: { OR: [{ senderId: userId }, { receiverId: userId }] },
            include: {
                sender: { select: { id: true, name: true, profileImage: true } },
                receiver: { select: { id: true, name: true, profileImage: true } },
            },
            orderBy: { createdAt: 'asc' },
        });
        return res.json({ success: true, data: messages });
    }
    catch (error) {
        return res.status(500).json({ success: false, message: 'Failed to fetch messages' });
    }
});
exports.apiRouter.post('/messages', auth_1.authenticateToken, async (req, res) => {
    try {
        const { receiverId, propertyId, content } = req.body;
        const message = await database_1.prisma.message.create({
            data: {
                senderId: req.user.id,
                receiverId,
                propertyId,
                content,
            },
            include: {
                sender: { select: { id: true, name: true, profileImage: true } },
            },
        });
        return res.status(201).json({ success: true, data: message });
    }
    catch (error) {
        return res.status(400).json({ success: false, message: 'Failed to send message' });
    }
});
exports.apiRouter.get('/notifications', auth_1.authenticateToken, async (req, res) => {
    try {
        const notifications = await database_1.prisma.notification.findMany({
            where: { userId: req.user.id },
            orderBy: { createdAt: 'desc' },
        });
        return res.json({ success: true, data: notifications });
    }
    catch (error) {
        return res.status(500).json({ success: false, message: 'Failed to fetch notifications' });
    }
});
