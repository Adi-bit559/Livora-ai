"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const prisma = new client_1.PrismaClient();
const CITIES = [
    { name: 'Mumbai', state: 'Maharashtra', minRent: 12000, maxRent: 38000, lat: 19.0760, lng: 72.8777, localities: ['Andheri West', 'Andheri East', 'Powai', 'Bandra', 'Ghatkopar', 'Vile Parle', 'Malad', 'Borivali', 'Thane West'] },
    { name: 'Pune', state: 'Maharashtra', minRent: 7000, maxRent: 26000, lat: 18.5204, lng: 73.8567, localities: ['Kothrud', 'Baner', 'Wakad', 'Viman Nagar', 'Hinjewadi', 'Hadapsar', 'Kharadi', 'Aundh'] },
    { name: 'Bengaluru', state: 'Karnataka', minRent: 8000, maxRent: 32000, lat: 12.9716, lng: 77.5946, localities: ['Koramangala', 'HSR Layout', 'Whitefield', 'Indiranagar', 'Marathahalli', 'Electronic City', 'BTM Layout', 'Bellandur'] },
    { name: 'Hyderabad', state: 'Telangana', minRent: 6500, maxRent: 25000, lat: 17.3850, lng: 78.4867, localities: ['Madhapur', 'Gachibowli', 'Kondapur', 'Hitech City', 'Kukatpally', 'Begumpet', 'Banjara Hills'] },
    { name: 'Delhi', state: 'Delhi NCR', minRent: 8000, maxRent: 32000, lat: 28.6139, lng: 77.2090, localities: ['Saket', 'Dwarka', 'Rohini', 'Laxmi Nagar', 'Hauz Khas', 'Connaught Place'] },
    { name: 'Gurugram', state: 'Haryana', minRent: 9000, maxRent: 35000, lat: 28.4595, lng: 77.0266, localities: ['Sector 44', 'Golf Course Road', 'DLF Phase 3', 'Cyber City', 'Sector 56'] },
    { name: 'Noida', state: 'Uttar Pradesh', minRent: 7000, maxRent: 24000, lat: 28.5355, lng: 77.3910, localities: ['Sector 62', 'Sector 137', 'Sector 18', 'Sector 76'] },
    { name: 'Chennai', state: 'Tamil Nadu', minRent: 7000, maxRent: 24000, lat: 13.0827, lng: 80.2707, localities: ['Velachery', 'OMR', 'Adyar', 'T. Nagar', 'Anna Nagar'] },
    { name: 'Kolkata', state: 'West Bengal', minRent: 5500, maxRent: 20000, lat: 22.5726, lng: 88.3639, localities: ['Salt Lake', 'New Town', 'Ballygunge', 'Dum Dum'] },
    { name: 'Ahmedabad', state: 'Gujarat', minRent: 6000, maxRent: 20000, lat: 23.0225, lng: 72.5714, localities: ['SG Highway', 'Navrangpura', 'Bodakdev', 'Prahlad Nagar'] },
    { name: 'Jaipur', state: 'Rajasthan', minRent: 5000, maxRent: 18000, lat: 26.9124, lng: 75.7873, localities: ['Malviya Nagar', 'Vaishali Nagar', 'Raja Park'] },
    { name: 'Lucknow', state: 'Uttar Pradesh', minRent: 5000, maxRent: 18000, lat: 26.8467, lng: 80.9462, localities: ['Gomti Nagar', 'Hazratganj', 'Aliganj'] },
    { name: 'Kochi', state: 'Kerala', minRent: 6000, maxRent: 20000, lat: 9.9312, lng: 76.2673, localities: ['Kakkanad', 'Edappally', 'Marine Drive'] },
    { name: 'Indore', state: 'Madhya Pradesh', minRent: 5000, maxRent: 17000, lat: 22.7196, lng: 75.8577, localities: ['Vijay Nagar', 'Palasia', 'Bhawarkua'] },
    { name: 'Chandigarh', state: 'Punjab', minRent: 7000, maxRent: 22000, lat: 30.7333, lng: 76.7794, localities: ['Sector 17', 'Sector 35', 'Sector 22'] },
];
const PROPERTY_PREFIXES = ['Urban Nest', 'Starlight Living', 'Skyline Executive', 'Cosmo Spaces', 'Harmony Co-Living', 'Greenfield Hostel', 'Prime Elite', 'Horizon Stay', 'Aura Suites', 'Serene Haven'];
const PROPERTY_TYPES = ['PG', 'FLAT', 'HOSTEL', 'CO_LIVING', 'APARTMENT'];
const ROOM_TYPES = ['SINGLE', 'DOUBLE', 'TRIPLE', 'FOUR_SHARING'];
const ALL_AMENITIES = ['WiFi', 'AC', 'Power Backup', 'Laundry', 'Food', 'Housekeeping', 'Parking', 'Security', 'CCTV', 'Gym', 'Lift', 'Hot Water', 'Attached Bathroom', 'Balcony', 'Kitchen', 'RO Water', 'Washing Machine'];
async function main() {
    console.log('🌱 Starting Livora AI database seed process (SQLite data/livora.db)...');
    // Clean existing tables gracefully
    await prisma.transaction.deleteMany();
    await prisma.bookingFinancial.deleteMany();
    await prisma.subscription.deleteMany();
    await prisma.review.deleteMany();
    await prisma.payment.deleteMany();
    await prisma.booking.deleteMany();
    await prisma.amenity.deleteMany();
    await prisma.room.deleteMany();
    await prisma.verification.deleteMany();
    await prisma.savedProperty.deleteMany();
    await prisma.notification.deleteMany();
    await prisma.message.deleteMany();
    await prisma.roommateProfile.deleteMany();
    await prisma.property.deleteMany();
    await prisma.user.deleteMany();
    const passwordHash = await bcryptjs_1.default.hash('Demo@12345', 10);
    const now = new Date();
    const thirtyDaysLater = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    // 1. Create Demo Core Accounts
    console.log('👤 Creating Development Demo Accounts...');
    const renterDemo = await prisma.user.create({
        data: {
            name: 'Aditya Sharma (Demo Renter)',
            email: 'renter@demo.livora.ai',
            passwordHash,
            role: 'RENTER',
            city: 'Mumbai',
            phone: '+919876543210',
            emailVerified: true,
            bio: 'Software engineer looking for a peaceful co-living PG near Andheri West.',
            roommateProfile: {
                create: {
                    budgetMin: 8000,
                    budgetMax: 22000,
                    preferredCity: 'Mumbai',
                    preferredLocalities: 'Andheri West, Bandra',
                    sleepSchedule: 'EARLY_BIRD',
                    cleanlinessLevel: 'HIGH',
                    socialLevel: 'AMBIVERT',
                    foodPreference: 'VEG',
                    smokingPreference: 'NON_SMOKER',
                    hobbies: 'Coding, Badminton, Reading, Music',
                },
            },
        },
    });
    const ownerDemo = await prisma.user.create({
        data: {
            name: 'Rajesh Verma (Demo Owner)',
            email: 'owner@demo.livora.ai',
            passwordHash,
            role: 'OWNER',
            city: 'Mumbai',
            phone: '+919812345678',
            emailVerified: true,
            bio: 'Premium PG & Co-living property owner with verified spaces across Mumbai & Pune.',
            subscriptions: {
                create: {
                    plan: 'PRO',
                    price: 199,
                    status: 'ACTIVE',
                    startDate: now,
                    endDate: thirtyDaysLater,
                    trialStart: now,
                    trialEnd: now,
                    autoRenew: true,
                },
            },
        },
    });
    // Demo Pro Subscription Transaction
    await prisma.transaction.create({
        data: {
            userId: ownerDemo.id,
            type: 'SUBSCRIPTION',
            amount: 199,
            status: 'SUCCESS',
            description: 'Livora PRO Owner Subscription (₹199/mo - Demo Transaction)',
        },
    });
    const adminDemo = await prisma.user.create({
        data: {
            name: 'Livora Admin (System)',
            email: 'admin@demo.livora.ai',
            passwordHash,
            role: 'ADMIN',
            city: 'Bengaluru',
            emailVerified: true,
        },
    });
    // 2. Generate Synthetic Owners & Renters
    console.log('👥 Generating Synthetic Users & Owner Subscriptions across India...');
    const owners = [ownerDemo];
    for (let i = 1; i <= 25; i++) {
        const isPro = i % 2 === 0;
        const owner = await prisma.user.create({
            data: {
                name: `Owner ${i} (Livora Host)`,
                email: `owner${i}@livora.ai`,
                passwordHash,
                role: 'OWNER',
                city: CITIES[i % CITIES.length].name,
                phone: `+9198000${String(i).padStart(5, '0')}`,
                emailVerified: true,
                subscriptions: {
                    create: {
                        plan: isPro ? 'PRO' : 'BASIC',
                        price: isPro ? 199 : 99,
                        status: 'ACTIVE',
                        startDate: now,
                        endDate: thirtyDaysLater,
                        trialStart: now,
                        trialEnd: now,
                    },
                },
            },
        });
        await prisma.transaction.create({
            data: {
                userId: owner.id,
                type: 'SUBSCRIPTION',
                amount: isPro ? 199 : 99,
                status: 'SUCCESS',
                description: `Livora ${isPro ? 'PRO' : 'BASIC'} Owner Subscription (Demo Transaction)`,
            },
        });
        owners.push(owner);
    }
    // 3. Generate Properties & Rooms
    console.log('🏢 Seeding Properties & Rooms across 15+ Major Indian Cities...');
    let totalSeededProperties = 0;
    for (const city of CITIES) {
        for (const locality of city.localities) {
            const owner = owners[Math.floor(Math.random() * owners.length)];
            const prefix = PROPERTY_PREFIXES[Math.floor(Math.random() * PROPERTY_PREFIXES.length)];
            const propertyType = PROPERTY_TYPES[Math.floor(Math.random() * PROPERTY_TYPES.length)];
            const rentFrom = Math.floor(city.minRent + Math.random() * (city.maxRent - city.minRent));
            const rentTo = Math.floor(rentFrom + 3000 + Math.random() * 5000);
            const isVerified = Math.random() > 0.3;
            const trustScore = isVerified ? Math.floor(82 + Math.random() * 16) : Math.floor(65 + Math.random() * 15);
            const property = await prisma.property.create({
                data: {
                    ownerId: owner.id,
                    title: `${prefix} ${propertyType} ${locality}`,
                    description: `Spacious, fully managed ${propertyType} in the heart of ${locality}, ${city.name}. Features 24/7 power backup, high-speed WiFi, daily housekeeping, ₹0 brokerage, and verified security.`,
                    propertyType,
                    address: `Building ${Math.floor(Math.random() * 90 + 10)}, ${locality}, Near Metro Station`,
                    locality,
                    city: city.name,
                    state: city.state,
                    pincode: `400${Math.floor(Math.random() * 90 + 10)}`,
                    latitude: city.lat + (Math.random() - 0.5) * 0.05,
                    longitude: city.lng + (Math.random() - 0.5) * 0.05,
                    monthlyRentFrom: rentFrom,
                    monthlyRentTo: rentTo,
                    securityDeposit: rentFrom * 2,
                    genderPreference: Math.random() > 0.5 ? 'ANY' : Math.random() > 0.5 ? 'MALE' : 'FEMALE',
                    foodAvailable: Math.random() > 0.4,
                    furnished: Math.random() > 0.3 ? 'FULLY' : 'SEMI',
                    powerBackup: true,
                    isVerified,
                    verificationStatus: isVerified ? 'VERIFIED' : 'PENDING',
                    trustScore,
                    rating: Number((4.0 + Math.random() * 0.9).toFixed(1)),
                    reviewCount: Math.floor(5 + Math.random() * 25),
                    occupancyRate: Number((75 + Math.random() * 20).toFixed(1)),
                    isDemoListing: true,
                    dataSource: 'DEMO_SEEDED',
                },
            });
            totalSeededProperties++;
            const selectedAmenities = ALL_AMENITIES.slice(0, 8 + Math.floor(Math.random() * 6));
            await prisma.amenity.createMany({
                data: selectedAmenities.map((name) => ({ propertyId: property.id, name })),
            });
            const numRooms = 2 + Math.floor(Math.random() * 3);
            for (let r = 1; r <= numRooms; r++) {
                const roomType = ROOM_TYPES[Math.floor(Math.random() * ROOM_TYPES.length)];
                const beds = roomType === 'SINGLE' ? 1 : roomType === 'DOUBLE' ? 2 : roomType === 'TRIPLE' ? 3 : 4;
                const occupied = Math.floor(Math.random() * (beds + 1));
                await prisma.room.create({
                    data: {
                        propertyId: property.id,
                        roomNumber: `${r}0${Math.floor(Math.random() * 9 + 1)}`,
                        roomType,
                        sharingType: beds === 1 ? 'Private Room' : `${beds}-Sharing`,
                        monthlyRent: rentFrom + (r - 1) * 1500,
                        securityDeposit: rentFrom * 2,
                        ac: Math.random() > 0.3,
                        attachedBathroom: Math.random() > 0.4,
                        balcony: Math.random() > 0.5,
                        available: occupied < beds,
                        totalBeds: beds,
                        occupiedBeds: occupied,
                    },
                });
            }
            await prisma.verification.create({
                data: {
                    propertyId: property.id,
                    ownerId: owner.id,
                    status: isVerified ? 'VERIFIED' : 'PENDING',
                    reviewedByAdminId: isVerified ? adminDemo.id : null,
                },
            });
        }
    }
    // 4. Create Initial Sample Bookings & Financial Records for Demo User
    console.log('📝 Creating Initial Bookings & Platform Fee Records...');
    const firstProperty = await prisma.property.findFirst({
        include: { rooms: true },
    });
    if (firstProperty && firstProperty.rooms.length > 0) {
        const targetRoom = firstProperty.rooms[0];
        const platformFee = Math.round(targetRoom.monthlyRent * 0.02); // 2% platform fee
        const totalAmount = targetRoom.monthlyRent + targetRoom.securityDeposit + platformFee;
        const booking = await prisma.booking.create({
            data: {
                renterId: renterDemo.id,
                propertyId: firstProperty.id,
                roomId: targetRoom.id,
                moveInDate: new Date(),
                duration: 11,
                monthlyRent: targetRoom.monthlyRent,
                securityDeposit: targetRoom.securityDeposit,
                platformFee,
                brokerage: 0,
                totalAmount,
                status: 'CONFIRMED',
                payment: {
                    create: {
                        amount: totalAmount,
                        status: 'SUCCESS',
                        provider: 'MOCK_RAZORPAY',
                    },
                },
            },
        });
        await prisma.bookingFinancial.create({
            data: {
                bookingId: booking.id,
                rentAmount: targetRoom.monthlyRent,
                platformFee,
                brokerage: 0,
                securityDeposit: targetRoom.securityDeposit,
                totalAmount,
                status: 'SUCCESS',
            },
        });
        await prisma.transaction.create({
            data: {
                userId: renterDemo.id,
                type: 'BOOKING',
                referenceId: booking.id,
                amount: platformFee,
                status: 'SUCCESS',
                description: `Livora 2% Platform Fee for ${firstProperty.title} (Demo Transaction)`,
            },
        });
        await prisma.notification.createMany({
            data: [
                {
                    userId: renterDemo.id,
                    title: 'Booking Confirmed!',
                    message: `Your booking for ${firstProperty.title} has been confirmed. Brokerage: ₹0. Platform Fee (2%): ₹${platformFee}.`,
                    type: 'BOOKING',
                },
                {
                    userId: renterDemo.id,
                    title: 'AI Roommate Match Alert',
                    message: 'Found 5 new 90%+ compatible roommate profiles in Mumbai!',
                    type: 'MATCH',
                },
            ],
        });
    }
    console.log(`
🎉 Database Seed Completed Successfully!
------------------------------------------------
Database Path      : backend/data/livora.db
Properties Seeded  : ${totalSeededProperties}
Cities Covered     : ${CITIES.length} Indian Cities & Metro Regions
Demo Renter        : renter@demo.livora.ai  (Password: Demo@12345)
Demo Owner         : owner@demo.livora.ai   (Password: Demo@12345)
Demo Admin         : admin@demo.livora.ai   (Password: Demo@12345)
Monetization       : Renter ₹0 Brokerage + 2% Fee | Owner 7-day Trial, ₹99/mo Basic, ₹199/mo Pro
------------------------------------------------
`);
}
main()
    .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
})
    .finally(async () => {
    await prisma.$disconnect();
});
