"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculatePlatformFee = calculatePlatformFee;
exports.calculateRoommateMatch = calculateRoommateMatch;
exports.calculatePropertyTrustScore = calculatePropertyTrustScore;
exports.predictPropertyVacancy = predictPropertyVacancy;
exports.rankPropertyRecommendations = rankPropertyRecommendations;
/**
 * Reusable 2% platform fee calculation (Section 76)
 * Calculates 2% of monthly rent only (excludes deposit)
 */
function calculatePlatformFee(monthlyRent) {
    return Math.round(monthlyRent * 0.02);
}
function calculateRoommateMatch(profile1, profile2) {
    // 1. Sleep Schedule (15%)
    let sleepScore = 70;
    if (profile1.sleepSchedule === profile2.sleepSchedule) {
        sleepScore = 100;
    }
    else if ((profile1.sleepSchedule === 'EARLY_BIRD' && profile2.sleepSchedule === 'NIGHT_OWL') ||
        (profile1.sleepSchedule === 'NIGHT_OWL' && profile2.sleepSchedule === 'EARLY_BIRD')) {
        sleepScore = 55;
    }
    else {
        sleepScore = 85;
    }
    // 2. Cleanliness Level (15%)
    let cleanlinessScore = 70;
    if (profile1.cleanlinessLevel === profile2.cleanlinessLevel) {
        cleanlinessScore = 100;
    }
    else if ((profile1.cleanlinessLevel === 'HIGH' && profile2.cleanlinessLevel === 'RELAXED') ||
        (profile1.cleanlinessLevel === 'RELAXED' && profile2.cleanlinessLevel === 'HIGH')) {
        cleanlinessScore = 50;
    }
    else {
        cleanlinessScore = 80;
    }
    // 3. Budget (15%)
    const minBudget = Math.max(profile1.budgetMin || 5000, profile2.budgetMin || 5000);
    const maxBudget = Math.min(profile1.budgetMax || 30000, profile2.budgetMax || 30000);
    let budgetScore = 60;
    if (maxBudget >= minBudget) {
        budgetScore = 95;
    }
    else {
        const diff = Math.abs(minBudget - maxBudget);
        budgetScore = Math.max(30, 95 - Math.floor(diff / 500));
    }
    // 4. Social Level (10%)
    let socialScore = 75;
    if (profile1.socialLevel === profile2.socialLevel) {
        socialScore = 100;
    }
    else {
        socialScore = 80;
    }
    // 5. Food Preference (5%)
    let foodScore = 80;
    if (profile1.foodPreference === profile2.foodPreference) {
        foodScore = 100;
    }
    else if (profile1.foodPreference === 'VEG' && profile2.foodPreference === 'NON_VEG') {
        foodScore = 65;
    }
    // 6. Location Preference (10%)
    let locationScore = 80;
    if (profile1.preferredCity &&
        profile2.preferredCity &&
        profile1.preferredCity.toLowerCase() === profile2.preferredCity.toLowerCase()) {
        locationScore = 95;
    }
    // 7. Hobbies Overlap (5%)
    const hobbies1 = (profile1.hobbies || '').toLowerCase().split(',').map((h) => h.trim());
    const hobbies2 = (profile2.hobbies || '').toLowerCase().split(',').map((h) => h.trim());
    const commonHobbies = hobbies1.filter((h) => hobbies2.includes(h) && h.length > 0);
    let hobbiesScore = Math.min(100, 60 + commonHobbies.length * 20);
    // 8. Overall Lifestyle (15%)
    let lifestyleScore = Math.round((sleepScore + cleanlinessScore + socialScore) / 3);
    // Weighted sum
    const matchScore = Math.round(lifestyleScore * 0.15 +
        sleepScore * 0.15 +
        cleanlinessScore * 0.15 +
        budgetScore * 0.15 +
        locationScore * 0.1 +
        socialScore * 0.1 +
        foodScore * 0.05 +
        hobbiesScore * 0.05 +
        85 * 0.1);
    return {
        matchScore: Math.min(99, Math.max(50, matchScore)),
        breakdown: {
            sleep: sleepScore,
            cleanliness: cleanlinessScore,
            budget: budgetScore,
            lifestyle: lifestyleScore,
            hobbies: hobbiesScore,
            social: socialScore,
            food: foodScore,
            location: locationScore,
        },
    };
}
function calculatePropertyTrustScore(property) {
    let score = 50;
    // 1. Property Verification (25 points)
    if (property.verificationStatus === 'VERIFIED' || property.isVerified) {
        score += 25;
    }
    else if (property.verificationStatus === 'PENDING') {
        score += 10;
    }
    // 2. Owner Verification (20 points)
    if (property.owner?.phoneVerified)
        score += 10;
    if (property.owner?.emailVerified)
        score += 10;
    // 3. Reviews & Ratings (20 points)
    const rating = property.rating || 4.0;
    const reviewCount = property.reviewCount || 0;
    if (reviewCount > 0) {
        score += Math.min(20, Math.round((rating / 5) * 15 + Math.min(reviewCount, 10) * 0.5));
    }
    else {
        score += 10;
    }
    // 4. Listing Accuracy (15 points)
    if (property.reviews && property.reviews.length > 0) {
        const avgAccuracy = property.reviews.reduce((acc, r) => acc + (r.listingAccuracy || 5), 0) / property.reviews.length;
        score += Math.round((avgAccuracy / 5) * 15);
    }
    else {
        score += 12;
    }
    // 5. Booking Reliability & Power Backup (20 points)
    if (property.powerBackup)
        score += 10;
    if (property.foodAvailable)
        score += 5;
    score += 5;
    return Math.min(99, Math.max(30, Math.round(score)));
}
function predictPropertyVacancy(property) {
    const occupancy = property.occupancyRate || 85;
    let baseDays = 20;
    if (occupancy >= 95) {
        baseDays = 45;
    }
    else if (occupancy >= 80) {
        baseDays = 21;
    }
    else if (occupancy >= 60) {
        baseDays = 12;
    }
    else {
        baseDays = 5;
    }
    const minDays = Math.max(3, baseDays - 4);
    const maxDays = baseDays + 6;
    const confidence = Number((0.88 + (occupancy / 1000)).toFixed(2));
    return {
        predictedDays: baseDays,
        range: { min: minDays, max: maxDays },
        confidence,
    };
}
function rankPropertyRecommendations(properties, userProfile) {
    return properties.map((prop) => {
        let score = 70;
        const reasons = [];
        // Verified bonus
        if (prop.isVerified || prop.verificationStatus === 'VERIFIED') {
            score += 10;
            reasons.push('100% Verified Property');
        }
        // Featured bonus for Pro owners
        if (prop.featured) {
            score += 5;
            reasons.push('Featured Pro Property');
        }
        // TrustScore bonus
        if (prop.trustScore >= 85) {
            score += 8;
            reasons.push(`High TrustScore (${prop.trustScore}/100)`);
        }
        // Budget match if user profile available
        if (userProfile?.budgetMax && prop.monthlyRentFrom <= userProfile.budgetMax) {
            score += 10;
            reasons.push('Fits well within your monthly budget');
        }
        // Location match
        if (userProfile?.preferredCity &&
            prop.city.toLowerCase() === userProfile.preferredCity.toLowerCase()) {
            score += 10;
            reasons.push(`Located in your target city (${prop.city})`);
        }
        // Zero Brokerage guarantee
        reasons.push('₹0 Brokerage Guaranteed');
        // Power Backup
        if (prop.powerBackup) {
            reasons.push('24/7 Power Backup available');
        }
        const matchScore = Math.min(98, Math.max(60, score));
        return {
            property: prop,
            matchScore,
            reasons,
        };
    }).sort((a, b) => b.matchScore - a.matchScore);
}
