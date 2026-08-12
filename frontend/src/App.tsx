import React, { useState, useEffect } from 'react';
import { api, setAuthToken } from './lib/api';

export default function App() {
  // Navigation & User State
  const [activeTab, setActiveTab] = useState<'discover' | 'roommates' | 'compare' | 'pricing' | 'renter_dashboard' | 'owner_dashboard' | 'admin'>('discover');
  const [user, setUser] = useState<any>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authEmail, setAuthEmail] = useState('renter@demo.livora.ai');
  const [authPassword, setAuthPassword] = useState('Demo@12345');
  const [authRole, setAuthRole] = useState<'RENTER' | 'OWNER' | 'ADMIN'>('RENTER');

  // Search & Filter State
  const [searchCity, setSearchCity] = useState('');
  const [searchLocality, setSearchLocality] = useState('');
  const [propertyType, setPropertyType] = useState('');
  const [maxRent, setMaxRent] = useState<number>(40000);
  const [acOnly, setAcOnly] = useState(false);
  const [foodOnly, setFoodOnly] = useState(false);
  const [powerBackupOnly, setPowerBackupOnly] = useState(false);
  const [verifiedOnly, setVerifiedOnly] = useState(false);

  // Data States
  const [properties, setProperties] = useState<any[]>([]);
  const [loadingProperties, setLoadingProperties] = useState(false);
  const [selectedProperty, setSelectedProperty] = useState<any>(null);
  const [savedPropertyIds, setSavedPropertyIds] = useState<string[]>([]);
  const [compareList, setCompareList] = useState<any[]>([]);
  const [compareDetails, setCompareDetails] = useState<any[]>([]);
  const [roommateMatches, setRoommateMatches] = useState<any[]>([]);

  // Pre-Booking Modal & Price Calculation (2% Platform Fee)
  const [bookingModalOpen, setBookingModalOpen] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState<any>(null);
  const [moveInDate, setMoveInDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [bookingSuccessMsg, setBookingSuccessMsg] = useState<string | null>(null);

  // Owner Dashboard & Subscription State
  const [ownerAnalytics, setOwnerAnalytics] = useState<any>(null);
  const [ownerProperties, setOwnerProperties] = useState<any[]>([]);
  const [ownerSubscription, setOwnerSubscription] = useState<any>(null);
  const [showAddPropertyModal, setShowAddPropertyModal] = useState(false);
  const [demoPaymentModal, setDemoPaymentModal] = useState<{ open: boolean; plan: 'BASIC' | 'PRO'; price: number }>({ open: false, plan: 'BASIC', price: 99 });

  const [newProp, setNewProp] = useState({
    title: '',
    city: 'Mumbai',
    locality: 'Andheri West',
    address: '',
    propertyType: 'PG',
    monthlyRentFrom: 12000,
    monthlyRentTo: 18000,
    securityDeposit: 24000,
    foodAvailable: true,
    powerBackup: true,
  });

  // Admin Verification & Revenue State
  const [adminVerifications, setAdminVerifications] = useState<any[]>([]);
  const [adminRevenue, setAdminRevenue] = useState<any>(null);

  // Notifications Popover
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);

  // Fetch Current User on Mount
  useEffect(() => {
    fetchCurrentUser();
    fetchProperties();
  }, []);

  const fetchCurrentUser = async () => {
    const res = await api.auth.me();
    if (res.success && res.data) {
      setUser(res.data);
      fetchSaved();
      fetchNotifications();
    }
  };

  const fetchProperties = async () => {
    setLoadingProperties(true);
    const res = await api.properties.list({
      city: searchCity,
      locality: searchLocality,
      propertyType,
      maxRent: maxRent < 40000 ? maxRent : undefined,
      ac: acOnly ? 'true' : undefined,
      food: foodOnly ? 'true' : undefined,
      powerBackup: powerBackupOnly ? 'true' : undefined,
      verified: verifiedOnly ? 'true' : undefined,
    });
    setLoadingProperties(false);
    if (res.success && res.data) {
      setProperties(res.data);
    }
  };

  useEffect(() => {
    fetchProperties();
  }, [searchCity, propertyType, maxRent, acOnly, foodOnly, powerBackupOnly, verifiedOnly]);

  const fetchSaved = async () => {
    const res = await api.saved.list();
    if (res.success && res.data) {
      setSavedPropertyIds(res.data.map((p: any) => p.id));
    }
  };

  const fetchNotifications = async () => {
    const res = await api.notifications.list();
    if (res.success && res.data) {
      setNotifications(res.data);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await api.auth.login({ email: authEmail, password: authPassword });
    if (res.success && res.data) {
      setAuthToken(res.data.accessToken);
      setUser(res.data.user);
      setShowAuthModal(false);
      fetchSaved();
      fetchNotifications();
      if (res.data.user.role === 'OWNER') fetchOwnerData();
      if (res.data.user.role === 'ADMIN') fetchAdminData();
    } else {
      alert(res.message || 'Login failed');
    }
  };

  const handleDemoQuickLogin = async (email: string, role: 'RENTER' | 'OWNER' | 'ADMIN') => {
    setAuthEmail(email);
    setAuthPassword('Demo@12345');
    const res = await api.auth.login({ email, password: 'Demo@12345' });
    if (res.success && res.data) {
      setAuthToken(res.data.accessToken);
      setUser(res.data.user);
      setShowAuthModal(false);
      fetchSaved();
      fetchNotifications();
      if (role === 'OWNER') {
        setActiveTab('owner_dashboard');
        fetchOwnerData();
      } else if (role === 'ADMIN') {
        setActiveTab('admin');
        fetchAdminData();
      } else {
        setActiveTab('discover');
      }
    }
  };

  const toggleSaveProperty = async (propertyId: string) => {
    if (!user) {
      setShowAuthModal(true);
      return;
    }
    if (savedPropertyIds.includes(propertyId)) {
      await api.saved.remove(propertyId);
      setSavedPropertyIds(savedPropertyIds.filter((id) => id !== propertyId));
    } else {
      await api.saved.add(propertyId);
      setSavedPropertyIds([...savedPropertyIds, propertyId]);
    }
  };

  const toggleCompare = (property: any) => {
    const exists = compareList.find((p) => p.id === property.id);
    if (exists) {
      setCompareList(compareList.filter((p) => p.id !== property.id));
    } else {
      if (compareList.length >= 4) {
        alert('You can compare up to 4 properties at a time.');
        return;
      }
      setCompareList([...compareList, property]);
    }
  };

  const fetchCompareDetails = async () => {
    if (compareList.length === 0) return;
    const res = await api.compare.getComparison(compareList.map((p) => p.id));
    if (res.success && res.data) {
      setCompareDetails(res.data);
    }
  };

  useEffect(() => {
    if (activeTab === 'compare') {
      fetchCompareDetails();
    }
    if (activeTab === 'roommates') {
      fetchRoommateMatches();
    }
    if (activeTab === 'owner_dashboard' && user?.role === 'OWNER') {
      fetchOwnerData();
    }
    if (activeTab === 'admin' && user?.role === 'ADMIN') {
      fetchAdminData();
    }
  }, [activeTab, compareList]);

  const fetchRoommateMatches = async () => {
    const res = await api.roommates.getMatches();
    if (res.success && res.data) {
      setRoommateMatches(res.data);
    }
  };

  const openPropertyDetails = async (id: string) => {
    const res = await api.properties.getById(id);
    if (res.success && res.data) {
      setSelectedProperty(res.data);
    }
  };

  const handlePreBookRoom = (room: any) => {
    if (!user) {
      setShowAuthModal(true);
      return;
    }
    setSelectedRoom(room);
    setBookingModalOpen(true);
  };

  const submitPreBooking = async () => {
    if (!selectedProperty || !selectedRoom) return;
    const res = await api.bookings.create({
      propertyId: selectedProperty.id,
      roomId: selectedRoom.id,
      moveInDate,
      duration: 11,
    });

    if (res.success) {
      setBookingSuccessMsg('🎉 Pre-booking confirmed with ₹0 Brokerage & 2% Platform Fee!');
      setTimeout(() => {
        setBookingSuccessMsg(null);
        setBookingModalOpen(false);
        openPropertyDetails(selectedProperty.id);
      }, 2500);
    } else {
      alert(res.message || 'Booking failed');
    }
  };

  // Owner Functions
  const fetchOwnerData = async () => {
    const [analyticsRes, propsRes, subRes] = await Promise.all([
      api.owner.getAnalytics(),
      api.owner.getProperties(),
      api.owner.getSubscription(),
    ]);
    if (analyticsRes.success) setOwnerAnalytics(analyticsRes.data);
    if (propsRes.success) setOwnerProperties(propsRes.data);
    if (subRes.success) setOwnerSubscription(subRes.data);
  };

  const handleCreateProperty = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await api.properties.create(newProp);
    if (res.success) {
      setShowAddPropertyModal(false);
      fetchOwnerData();
      fetchProperties();
      alert('Property created successfully! Pending admin verification.');
    } else {
      alert(res.message || 'Failed to create property');
    }
  };

  const confirmDemoSubscription = async () => {
    const res = await api.owner.subscribe(demoPaymentModal.plan);
    if (res.success) {
      setDemoPaymentModal({ ...demoPaymentModal, open: false });
      fetchOwnerData();
      alert(`🎉 Demo Subscription Active! Subscribed to Livora ${demoPaymentModal.plan} Plan.`);
    } else {
      alert(res.message || 'Subscription failed');
    }
  };

  // Admin Functions
  const fetchAdminData = async () => {
    const [verifRes, revRes] = await Promise.all([
      api.admin.getVerifications(),
      api.admin.getRevenue(),
    ]);
    if (verifRes.success && verifRes.data) setAdminVerifications(verifRes.data);
    if (revRes.success && revRes.data) setAdminRevenue(revRes.data);
  };

  const handleVerifyProperty = async (id: string) => {
    const res = await api.admin.verifyProperty(id);
    if (res.success) {
      fetchAdminData();
      fetchProperties();
      alert('Property verified and TrustScore updated to 92+!');
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#f7f9fb] text-[#191c1e]">
      {/* Top Navbar */}
      <nav className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => setActiveTab('discover')}>
            <div className="w-9 h-9 rounded-lg bg-gradient-to-tr from-blue-600 to-purple-600 flex items-center justify-center text-white font-bold shadow-md">
              <span className="material-symbols-outlined text-xl">house</span>
            </div>
            <div>
              <span className="text-xl font-bold tracking-tight text-gray-900">Livora AI</span>
              <span className="ml-2 text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200">
                ₹0 Brokerage
              </span>
            </div>
          </div>

          {/* Nav Links */}
          <div className="hidden md:flex items-center gap-6">
            <button
              onClick={() => setActiveTab('discover')}
              className={`font-semibold text-sm transition-colors ${activeTab === 'discover' ? 'text-blue-600 border-b-2 border-blue-600 pb-1' : 'text-gray-600 hover:text-gray-900'}`}
            >
              Discover & Search
            </button>
            <button
              onClick={() => setActiveTab('roommates')}
              className={`font-semibold text-sm flex items-center gap-1.5 transition-colors ${activeTab === 'roommates' ? 'text-purple-600 border-b-2 border-purple-600 pb-1' : 'text-gray-600 hover:text-purple-600'}`}
            >
              <span className="material-symbols-outlined text-sm">auto_awesome</span>
              AI Roommates
            </button>
            <button
              onClick={() => setActiveTab('compare')}
              className={`font-semibold text-sm flex items-center gap-1 transition-colors ${activeTab === 'compare' ? 'text-blue-600 border-b-2 border-blue-600 pb-1' : 'text-gray-600 hover:text-gray-900'}`}
            >
              Compare ({compareList.length})
            </button>
            <button
              onClick={() => setActiveTab('pricing')}
              className={`font-semibold text-sm transition-colors ${activeTab === 'pricing' ? 'text-blue-600 border-b-2 border-blue-600 pb-1' : 'text-gray-600 hover:text-gray-900'}`}
            >
              Owner Pricing
            </button>
            {user?.role === 'OWNER' && (
              <button
                onClick={() => setActiveTab('owner_dashboard')}
                className={`font-semibold text-sm transition-colors ${activeTab === 'owner_dashboard' ? 'text-blue-600 border-b-2 border-blue-600 pb-1' : 'text-gray-600 hover:text-gray-900'}`}
              >
                Owner Dashboard
              </button>
            )}
            {user?.role === 'ADMIN' && (
              <button
                onClick={() => setActiveTab('admin')}
                className={`font-semibold text-sm transition-colors ${activeTab === 'admin' ? 'text-red-600 border-b-2 border-red-600 pb-1' : 'text-gray-600 hover:text-red-600'}`}
              >
                Admin Verification & Revenue
              </button>
            )}
            {user?.role === 'RENTER' && (
              <button
                onClick={() => setActiveTab('renter_dashboard')}
                className={`font-semibold text-sm transition-colors ${activeTab === 'renter_dashboard' ? 'text-blue-600 border-b-2 border-blue-600 pb-1' : 'text-gray-600 hover:text-gray-900'}`}
              >
                Renter Dashboard
              </button>
            )}
          </div>

          {/* User Actions */}
          <div className="flex items-center gap-3">
            {/* Notifications Popover Trigger */}
            <div className="relative">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="p-2 text-gray-600 hover:text-blue-600 rounded-full hover:bg-gray-100 relative"
              >
                <span className="material-symbols-outlined text-xl">notifications</span>
                {notifications.length > 0 && (
                  <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full"></span>
                )}
              </button>

              {showNotifications && (
                <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-xl border border-gray-200 p-4 z-50">
                  <h4 className="font-bold text-gray-900 mb-3 flex items-center justify-between text-sm">
                    Notifications
                    <span className="text-xs text-blue-600">{notifications.length} recent</span>
                  </h4>
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <p className="text-xs text-gray-500">No new notifications.</p>
                    ) : (
                      notifications.map((n) => (
                        <div key={n.id} className="p-2 bg-gray-50 rounded-lg text-xs border border-gray-100">
                          <p className="font-semibold text-gray-800">{n.title}</p>
                          <p className="text-gray-600 mt-0.5">{n.message}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Auth Buttons */}
            {user ? (
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-gray-700 bg-gray-100 px-3 py-1.5 rounded-full border border-gray-200">
                  {user.name} ({user.role})
                </span>
                <button
                  onClick={() => {
                    setAuthToken(null);
                    setUser(null);
                    setActiveTab('discover');
                  }}
                  className="text-xs text-red-600 hover:underline"
                >
                  Logout
                </button>
              </div>
            ) : (
              <div className="flex gap-2">
                <button
                  onClick={() => setShowAuthModal(true)}
                  className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-4 py-2 rounded-lg shadow-sm transition-all"
                >
                  Login / Register
                </button>
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* DISCOVER & SEARCH TAB */}
      {activeTab === 'discover' && (
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Hero Header */}
          <div className="relative rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-8 sm:p-12 text-white shadow-xl overflow-hidden mb-8">
            <div className="relative z-10 max-w-2xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 text-xs font-semibold border border-blue-400/30 mb-4">
                <span className="material-symbols-outlined text-sm">auto_awesome</span>
                AI-Powered Rental Search & Matching Engine
              </div>
              <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight leading-tight">
                Find your place. <br />
                <span className="text-blue-400">Find your people.</span> Live better.
              </h1>
              <p className="mt-3 text-slate-300 text-sm sm:text-base">
                Discover verified PGs, Flats, Hostels, and Co-living spaces across 40+ Indian cities with <strong className="text-emerald-400">₹0 brokerage fees</strong>.
              </p>

              {/* Large Search Controls */}
              <div className="mt-6 glass-panel rounded-xl p-3 text-gray-900 shadow-2xl flex flex-col sm:flex-row gap-3">
                <div className="flex-1 flex items-center px-3 py-2 bg-white rounded-lg border border-gray-200">
                  <span className="material-symbols-outlined text-gray-400 mr-2">location_on</span>
                  <input
                    type="text"
                    placeholder="Enter City (e.g. Mumbai, Pune, Bengaluru)"
                    value={searchCity}
                    onChange={(e) => setSearchCity(e.target.value)}
                    className="w-full text-sm bg-transparent outline-none placeholder:text-gray-400"
                  />
                </div>
                <div className="flex-1 flex items-center px-3 py-2 bg-white rounded-lg border border-gray-200">
                  <span className="material-symbols-outlined text-gray-400 mr-2">travel_explore</span>
                  <input
                    type="text"
                    placeholder="Locality (e.g. Andheri, Koramangala)"
                    value={searchLocality}
                    onChange={(e) => setSearchLocality(e.target.value)}
                    className="w-full text-sm bg-transparent outline-none placeholder:text-gray-400"
                  />
                </div>
                <button
                  onClick={fetchProperties}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 shadow-md transition-all"
                >
                  <span className="material-symbols-outlined text-base">search</span>
                  Search
                </button>
              </div>

              {/* Quick City Chips */}
              <div className="mt-4 flex flex-wrap gap-2 text-xs text-slate-300 items-center">
                <span>Popular Cities:</span>
                {['Mumbai', 'Pune', 'Bengaluru', 'Hyderabad', 'Delhi', 'Gurugram'].map((city) => (
                  <button
                    key={city}
                    onClick={() => setSearchCity(city)}
                    className="px-2.5 py-1 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
                  >
                    {city}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Business Model Explanation Banner (Section 95) */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-2xl border border-blue-200 mb-8 grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold text-lg shrink-0">
                ₹0
              </div>
              <div>
                <h3 className="font-bold text-gray-900 text-sm">For Renters — ₹0 Brokerage</h3>
                <p className="text-gray-600 mt-1 leading-relaxed">
                  Browse and pre-book verified spaces with direct owner contact. Livora charges a <strong>2% platform fee on monthly rent only</strong> upon booking confirmation. Brokerage is 100% ₹0.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-600 text-white flex items-center justify-center font-bold text-lg shrink-0">
                7d
              </div>
              <div>
                <h3 className="font-bold text-gray-900 text-sm">For Property Owners — 7-Day Free Trial</h3>
                <p className="text-gray-600 mt-1 leading-relaxed">
                  List and manage properties without traditional brokerage fees. Start with a 7-day free trial, then choose <strong>Basic (₹99/mo)</strong> or <strong>Pro (₹199/mo)</strong>.
                </p>
              </div>
            </div>
          </div>

          {/* Filters Bar */}
          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm mb-8 flex flex-wrap items-center justify-between gap-4 text-xs">
            <div className="flex flex-wrap items-center gap-3">
              <div>
                <label className="font-semibold text-gray-700 block mb-1">Property Type</label>
                <select
                  value={propertyType}
                  onChange={(e) => setPropertyType(e.target.value)}
                  className="px-3 py-1.5 rounded-lg border border-gray-300 bg-gray-50 font-medium"
                >
                  <option value="">All Types</option>
                  <option value="PG">PG</option>
                  <option value="FLAT">Flat</option>
                  <option value="HOSTEL">Hostel</option>
                  <option value="CO_LIVING">Co-Living</option>
                  <option value="APARTMENT">Apartment</option>
                </select>
              </div>

              <div>
                <label className="font-semibold text-gray-700 block mb-1">Max Rent: ₹{maxRent.toLocaleString()}</label>
                <input
                  type="range"
                  min="5000"
                  max="40000"
                  step="1000"
                  value={maxRent}
                  onChange={(e) => setMaxRent(parseInt(e.target.value))}
                  className="w-36 accent-blue-600"
                />
              </div>

              <label className="flex items-center gap-1.5 font-semibold text-gray-700 cursor-pointer mt-4 sm:mt-0">
                <input type="checkbox" checked={acOnly} onChange={(e) => setAcOnly(e.target.checked)} className="rounded text-blue-600" />
                AC Available
              </label>

              <label className="flex items-center gap-1.5 font-semibold text-gray-700 cursor-pointer mt-4 sm:mt-0">
                <input type="checkbox" checked={foodOnly} onChange={(e) => setFoodOnly(e.target.checked)} className="rounded text-blue-600" />
                Food Included
              </label>

              <label className="flex items-center gap-1.5 font-semibold text-gray-700 cursor-pointer mt-4 sm:mt-0">
                <input type="checkbox" checked={powerBackupOnly} onChange={(e) => setPowerBackupOnly(e.target.checked)} className="rounded text-blue-600" />
                24/7 Power Backup
              </label>

              <label className="flex items-center gap-1.5 font-semibold text-emerald-700 cursor-pointer mt-4 sm:mt-0">
                <input type="checkbox" checked={verifiedOnly} onChange={(e) => setVerifiedOnly(e.target.checked)} className="rounded text-emerald-600" />
                Verified Only
              </label>
            </div>

            <span className="text-gray-500 font-semibold">{properties.length} Listings Found</span>
          </div>

          {/* Properties Grid */}
          {loadingProperties ? (
            <div className="text-center py-16 text-gray-500 font-medium">Loading properties from backend...</div>
          ) : properties.length === 0 ? (
            <div className="text-center py-16 text-gray-500">
              <p className="text-lg font-semibold">No properties matched your criteria.</p>
              <button onClick={() => { setSearchCity(''); setPropertyType(''); setMaxRent(40000); setAcOnly(false); }} className="mt-3 text-sm text-blue-600 font-semibold hover:underline">
                Clear Filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {properties.map((prop) => {
                const isSaved = savedPropertyIds.includes(prop.id);
                const isComparing = compareList.some((p) => p.id === prop.id);
                const isVerified = prop.isVerified || prop.verificationStatus === 'VERIFIED';
                return (
                  <div key={prop.id} className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden hover:shadow-md transition-shadow flex flex-col group">
                    <div className="relative h-48 bg-slate-100 overflow-hidden">
                      <img
                        src={`https://picsum.photos/seed/${prop.id}/600/400`}
                        alt={prop.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                      {prop.isDemoListing && (
                        <span className="absolute top-3 left-3 bg-slate-900/80 backdrop-blur-sm text-white px-2 py-0.5 rounded text-[10px] font-semibold">
                          Demo Listing
                        </span>
                      )}
                      {isVerified && (
                        <span className="absolute top-3 right-3 bg-emerald-600 text-white px-2 py-0.5 rounded-full text-xs font-semibold flex items-center gap-1 shadow-sm">
                          ✓ Livora Verified
                        </span>
                      )}
                      <div className="absolute bottom-3 right-3 bg-blue-900 text-white px-3 py-1 rounded-lg text-sm font-bold shadow-lg">
                        ₹{prop.monthlyRentFrom.toLocaleString()}<span className="text-xs text-blue-200 font-normal">/mo</span>
                      </div>
                    </div>

                    <div className="p-5 flex flex-col flex-grow">
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="font-bold text-gray-900 text-lg line-clamp-1">{prop.title}</h3>
                      </div>
                      <p className="text-xs text-gray-500 mb-3 flex items-center gap-1">
                        <span className="material-symbols-outlined text-sm text-gray-400">location_on</span>
                        {prop.locality}, {prop.city}
                      </p>

                      {/* Badges */}
                      <div className="flex flex-wrap gap-2 mb-4">
                        <span className="px-2 py-1 bg-purple-50 text-purple-700 text-xs font-semibold rounded-md border border-purple-100 flex items-center gap-1">
                          <span className="material-symbols-outlined text-xs">auto_awesome</span> TrustScore: {prop.trustScore}
                        </span>
                        <span className="px-2 py-1 bg-emerald-50 text-emerald-700 text-xs font-semibold rounded-md border border-emerald-100">
                          ₹0 Brokerage
                        </span>
                        {prop.powerBackup && (
                          <span className="px-2 py-1 bg-amber-50 text-amber-700 text-xs font-semibold rounded-md border border-amber-100">
                            Power Backup
                          </span>
                        )}
                      </div>

                      {/* Card Footer Actions */}
                      <div className="mt-auto pt-4 border-t border-gray-100 flex items-center justify-between gap-2">
                        <div className="flex gap-2">
                          <button
                            onClick={() => toggleSaveProperty(prop.id)}
                            className={`p-2 rounded-lg border text-xs font-semibold transition-colors ${isSaved ? 'bg-red-50 text-red-600 border-red-200' : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'}`}
                            title="Save Property"
                          >
                            <span className="material-symbols-outlined text-base">{isSaved ? 'favorite' : 'favorite_border'}</span>
                          </button>
                          <button
                            onClick={() => toggleCompare(prop)}
                            className={`p-2 rounded-lg border text-xs font-semibold transition-colors ${isComparing ? 'bg-blue-50 text-blue-600 border-blue-200' : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'}`}
                            title="Add to Compare"
                          >
                            <span className="material-symbols-outlined text-base">compare_arrows</span>
                          </button>
                        </div>

                        <button
                          onClick={() => openPropertyDetails(prop.id)}
                          className="flex-1 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold py-2 px-3 rounded-lg shadow-sm text-center transition-colors"
                        >
                          View Details & Pre-Book
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </main>
      )}

      {/* PROPERTY DETAIL MODAL */}
      {selectedProperty && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white max-w-4xl w-full rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col my-8">
            <div className="p-6 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold px-2 py-0.5 bg-blue-500/20 text-blue-300 rounded border border-blue-400/30">
                  {selectedProperty.propertyType}
                </span>
                <h2 className="text-2xl font-bold mt-1">{selectedProperty.title}</h2>
                <p className="text-xs text-slate-300 flex items-center gap-1 mt-0.5">
                  <span className="material-symbols-outlined text-sm">location_on</span> {selectedProperty.address}, {selectedProperty.locality}, {selectedProperty.city}
                </p>
              </div>
              <button onClick={() => setSelectedProperty(null)} className="p-2 hover:bg-white/10 rounded-full">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-6 text-sm text-gray-700">
              {/* Image & Key Badges */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <img src={`https://picsum.photos/seed/${selectedProperty.id}/800/500`} alt={selectedProperty.title} className="md:col-span-2 h-64 w-full object-cover rounded-xl shadow" />
                <div className="bg-slate-50 p-4 rounded-xl border border-gray-200 space-y-3">
                  <div className="p-3 bg-white rounded-lg border border-gray-200 shadow-sm">
                    <p className="text-xs text-gray-500">Monthly Rent</p>
                    <p className="text-xl font-extrabold text-blue-600">₹{selectedProperty.monthlyRentFrom.toLocaleString()} <span className="text-xs text-gray-500 font-normal">/mo</span></p>
                  </div>
                  <div className="p-3 bg-white rounded-lg border border-gray-200 shadow-sm">
                    <p className="text-xs text-gray-500">Brokerage Fee</p>
                    <p className="text-base font-extrabold text-emerald-600">₹0 (Brokerage Free)</p>
                  </div>
                  <div className="p-3 bg-purple-50 rounded-lg border border-purple-100 shadow-sm">
                    <p className="text-xs text-purple-700 font-semibold">AI TrustScore</p>
                    <p className="text-lg font-bold text-purple-900">{selectedProperty.trustScore} / 100</p>
                  </div>
                  <div className="p-3 bg-amber-50 rounded-lg border border-amber-100 shadow-sm">
                    <p className="text-xs text-amber-700 font-semibold">Predictive Vacancy</p>
                    <p className="text-xs font-bold text-amber-900">Est. vacant in {selectedProperty.vacancyPrediction?.predictedDays || 21} days</p>
                  </div>
                </div>
              </div>

              {/* Rooms & Availability */}
              <div>
                <h3 className="font-bold text-gray-900 text-base mb-3">Available Rooms & Beds</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {selectedProperty.rooms?.map((room: any) => (
                    <div key={room.id} className="p-4 bg-white border border-gray-200 rounded-xl flex items-center justify-between shadow-sm">
                      <div>
                        <p className="font-bold text-gray-900">Room {room.roomNumber} ({room.sharingType})</p>
                        <p className="text-xs text-gray-500">Rent: ₹{room.monthlyRent.toLocaleString()}/mo • Deposit: ₹{room.securityDeposit.toLocaleString()}</p>
                        <p className="text-xs font-semibold text-emerald-600 mt-1">{room.totalBeds - room.occupiedBeds} Beds Available</p>
                      </div>
                      <button
                        onClick={() => handlePreBookRoom(room)}
                        disabled={!room.available || room.occupiedBeds >= room.totalBeds}
                        className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white text-xs font-semibold px-4 py-2 rounded-lg shadow-sm"
                      >
                        Pre-Book (₹0)
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Amenities */}
              <div>
                <h3 className="font-bold text-gray-900 text-base mb-2">Amenities</h3>
                <div className="flex flex-wrap gap-2">
                  {selectedProperty.amenities?.map((a: any) => (
                    <span key={a.id} className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-semibold border border-gray-200">
                      {a.name}
                    </span>
                  ))}
                </div>
              </div>

              {/* Description */}
              <div>
                <h3 className="font-bold text-gray-900 text-base mb-1">About Property</h3>
                <p className="text-gray-600 leading-relaxed text-xs sm:text-sm">{selectedProperty.description}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PRE-BOOKING MODAL WITH 2% PLATFORM FEE BREAKDOWN (Sections 74, 75, 93) */}
      {bookingModalOpen && selectedRoom && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white max-w-md w-full rounded-2xl shadow-2xl p-6 border border-gray-200">
            <h3 className="text-xl font-bold text-gray-900 mb-1">Confirm Pre-Booking</h3>
            <p className="text-xs text-gray-500 mb-4">Review transparent price breakdown with ₹0 brokerage.</p>

            {bookingSuccessMsg ? (
              <div className="p-4 bg-emerald-50 text-emerald-800 rounded-xl font-semibold text-sm text-center border border-emerald-200">
                {bookingSuccessMsg}
              </div>
            ) : (
              <div className="space-y-4 text-xs">
                {/* Price Breakdown Table (Section 75) */}
                <div className="p-4 bg-slate-50 rounded-xl border border-gray-200 space-y-2">
                  <div className="flex justify-between text-gray-700">
                    <span>Monthly Rent</span>
                    <span className="font-bold">₹{selectedRoom.monthlyRent.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-gray-700">
                    <span>Security Deposit</span>
                    <span className="font-bold">₹{selectedRoom.securityDeposit.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-blue-700 font-semibold">
                    <span>Livora Platform Fee (2% of Rent)</span>
                    <span>₹{Math.round(selectedRoom.monthlyRent * 0.02).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-emerald-600 font-bold">
                    <span>Brokerage Fee</span>
                    <span>₹0 (Guaranteed)</span>
                  </div>
                  <div className="border-t border-gray-200 pt-2 flex justify-between font-extrabold text-gray-900 text-sm">
                    <span>Total Initial Payable</span>
                    <span>₹{(selectedRoom.monthlyRent + selectedRoom.securityDeposit + Math.round(selectedRoom.monthlyRent * 0.02)).toLocaleString()}</span>
                  </div>
                </div>

                <p className="text-[11px] text-gray-500 italic bg-blue-50/50 p-2.5 rounded-lg border border-blue-100">
                  “Livora charges a 2% platform fee on the monthly rent for successful bookings. Brokerage is ₹0.”
                </p>

                <div>
                  <label className="font-semibold text-gray-700 block mb-1">Select Move-in Date</label>
                  <input
                    type="date"
                    value={moveInDate}
                    onChange={(e) => setMoveInDate(e.target.value)}
                    className="w-full p-2.5 rounded-lg border border-gray-300 text-xs outline-none focus:border-blue-600"
                  />
                </div>

                <div className="pt-2 flex gap-3">
                  <button
                    onClick={() => setBookingModalOpen(false)}
                    className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg font-semibold text-gray-600 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={submitPreBooking}
                    className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold shadow-md"
                  >
                    Confirm Booking
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* OWNER PRICING TAB (Section 96) */}
      {activeTab === 'pricing' && (
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="text-center max-w-2xl mx-auto mb-10">
            <span className="px-3 py-1 rounded-full bg-blue-100 text-blue-700 text-xs font-semibold">
              Owner Subscription Plans
            </span>
            <h1 className="text-3xl font-extrabold text-gray-900 mt-3">Simple, Low-Cost Owner Plans</h1>
            <p className="text-gray-600 text-sm mt-2">
              Every new owner automatically gets a <strong>7-day FREE Trial</strong>. List and manage your properties with zero brokerage fees.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {/* Free Trial Plan */}
            <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm flex flex-col justify-between">
              <div>
                <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-100">
                  New Owner Bonus
                </span>
                <h3 className="text-2xl font-bold text-gray-900 mt-3">Free Trial</h3>
                <p className="text-3xl font-extrabold text-gray-900 mt-2">₹0 <span className="text-xs text-gray-500 font-normal">/ 7 days</span></p>
                <ul className="mt-6 space-y-2.5 text-xs text-gray-600">
                  <li className="flex items-center gap-2"><span className="text-emerald-500 font-bold">✓</span> Up to 2 Active Properties</li>
                  <li className="flex items-center gap-2"><span className="text-emerald-500 font-bold">✓</span> Full Room Management</li>
                  <li className="flex items-center gap-2"><span className="text-emerald-500 font-bold">✓</span> Booking Requests</li>
                  <li className="flex items-center gap-2"><span className="text-emerald-500 font-bold">✓</span> Basic Owner Analytics</li>
                </ul>
              </div>
              <button
                onClick={() => setShowAuthModal(true)}
                className="mt-8 w-full bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs font-semibold py-2.5 rounded-lg"
              >
                Start Free Trial
              </button>
            </div>

            {/* Basic Plan */}
            <div className="bg-white p-6 rounded-2xl border-2 border-blue-600 shadow-md flex flex-col justify-between relative">
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-[10px] font-bold px-3 py-0.5 rounded-full uppercase tracking-wider">
                Most Popular
              </span>
              <div>
                <h3 className="text-2xl font-bold text-gray-900 mt-1">Basic Plan</h3>
                <p className="text-3xl font-extrabold text-blue-600 mt-2">₹99 <span className="text-xs text-gray-500 font-normal">/ month</span></p>
                <ul className="mt-6 space-y-2.5 text-xs text-gray-600">
                  <li className="flex items-center gap-2"><span className="text-blue-600 font-bold">✓</span> Up to 2 Active Properties</li>
                  <li className="flex items-center gap-2"><span className="text-blue-600 font-bold">✓</span> Booking & Tenant Management</li>
                  <li className="flex items-center gap-2"><span className="text-blue-600 font-bold">✓</span> TrustScore & Vacancy Insights</li>
                  <li className="flex items-center gap-2"><span className="text-blue-600 font-bold">✓</span> Full Analytics Access</li>
                </ul>
              </div>
              <button
                onClick={() => {
                  if (!user) setShowAuthModal(true);
                  else setDemoPaymentModal({ open: true, plan: 'BASIC', price: 99 });
                }}
                className="mt-8 w-full bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold py-2.5 rounded-lg shadow-sm"
              >
                Choose Basic (₹99)
              </button>
            </div>

            {/* Pro Plan */}
            <div className="bg-gradient-to-b from-purple-900 to-slate-900 p-6 rounded-2xl text-white shadow-xl flex flex-col justify-between">
              <div>
                <span className="text-xs font-bold text-purple-300 bg-purple-500/20 px-2.5 py-1 rounded-full border border-purple-400/30">
                  Maximum Growth
                </span>
                <h3 className="text-2xl font-bold mt-3">Pro Plan</h3>
                <p className="text-3xl font-extrabold text-purple-300 mt-2">₹199 <span className="text-xs text-slate-400 font-normal">/ month</span></p>
                <ul className="mt-6 space-y-2.5 text-xs text-slate-200">
                  <li className="flex items-center gap-2"><span className="text-purple-400 font-bold">✓</span> Up to 10 Active Properties</li>
                  <li className="flex items-center gap-2"><span className="text-purple-400 font-bold">✓</span> Featured Listing Placement</li>
                  <li className="flex items-center gap-2"><span className="text-purple-400 font-bold">✓</span> Advanced Vacancy Forecasting</li>
                  <li className="flex items-center gap-2"><span className="text-purple-400 font-bold">✓</span> Priority Discovery Ranking</li>
                </ul>
              </div>
              <button
                onClick={() => {
                  if (!user) setShowAuthModal(true);
                  else setDemoPaymentModal({ open: true, plan: 'PRO', price: 199 });
                }}
                className="mt-8 w-full bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold py-2.5 rounded-lg shadow-sm"
              >
                Choose Pro (₹199)
              </button>
            </div>
          </div>
        </main>
      )}

      {/* DEMO PAYMENT MODAL (Sections 71, 84, 108) */}
      {demoPaymentModal.open && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white max-w-sm w-full rounded-2xl shadow-2xl p-6 border border-gray-200">
            <h3 className="text-lg font-bold text-gray-900 mb-1">Demo Subscription Payment</h3>
            <p className="text-xs text-gray-500 mb-4">Simulating local subscription activation via demo transaction engine.</p>

            <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 space-y-2 text-xs mb-4">
              <div className="flex justify-between">
                <span className="text-gray-600">Selected Plan</span>
                <span className="font-bold text-gray-900">Livora {demoPaymentModal.plan}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Monthly Amount</span>
                <span className="font-extrabold text-blue-600">₹{demoPaymentModal.price}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Billing Cycle</span>
                <span>Monthly Auto-Renew</span>
              </div>
            </div>

            <p className="text-[10px] text-amber-700 bg-amber-50 p-2 rounded border border-amber-200 mb-4">
              <strong>Demo Transaction:</strong> No real card will be charged. Clicking confirm activates your subscription in SQLite.
            </p>

            <div className="flex gap-3 text-xs">
              <button
                onClick={() => setDemoPaymentModal({ ...demoPaymentModal, open: false })}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg font-semibold text-gray-600"
              >
                Cancel
              </button>
              <button
                onClick={confirmDemoSubscription}
                className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow-md"
              >
                Confirm Demo Payment
              </button>
            </div>
          </div>
        </div>
      )}

      {/* AI ROOMMATES TAB */}
      {activeTab === 'roommates' && (
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-gradient-to-r from-purple-900 via-indigo-900 to-slate-900 p-8 rounded-2xl text-white mb-8 shadow-xl">
            <div className="max-w-2xl">
              <span className="px-3 py-1 rounded-full bg-purple-500/20 text-purple-300 text-xs font-semibold border border-purple-400/30">
                AI Compatibility Scoring Engine
              </span>
              <h1 className="text-3xl font-extrabold mt-3">Smart Roommate Matching</h1>
              <p className="text-slate-300 text-sm mt-2">
                Our local algorithm matches you based on sleep schedule, cleanliness, budget, habits, and lifestyle preferences.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {roommateMatches.map((m: any) => (
              <div key={m.roommate.id} className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="font-bold text-gray-900 text-base">{m.roommate.user?.name}</h3>
                      <p className="text-xs text-gray-500">{m.roommate.user?.city} • {m.roommate.occupation || 'Student / Professional'}</p>
                    </div>
                    <span className="px-3 py-1 bg-purple-50 text-purple-700 rounded-full font-bold text-xs border border-purple-200">
                      {m.matchScore}% Match
                    </span>
                  </div>

                  <p className="text-xs text-gray-600 mb-4">{m.roommate.user?.bio || 'Looking for compatible roommate in good PG.'}</p>

                  <div className="space-y-1.5 text-xs text-gray-600 bg-gray-50 p-3 rounded-xl mb-4">
                    <p><strong>Sleep:</strong> {m.roommate.sleepSchedule}</p>
                    <p><strong>Cleanliness:</strong> {m.roommate.cleanlinessLevel}</p>
                    <p><strong>Budget:</strong> ₹{m.roommate.budgetMin?.toLocaleString()} - ₹{m.roommate.budgetMax?.toLocaleString()}</p>
                    <p><strong>Hobbies:</strong> {m.roommate.hobbies}</p>
                  </div>
                </div>

                <button
                  onClick={() => alert(`Direct message sent to ${m.roommate.user?.name}!`)}
                  className="w-full bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold py-2.5 rounded-lg shadow-sm"
                >
                  Connect & Chat
                </button>
              </div>
            ))}
          </div>
        </main>
      )}

      {/* COMPARE TAB */}
      {activeTab === 'compare' && (
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">Property Comparison ({compareList.length} / 4)</h1>
          {compareList.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-2xl border border-gray-200 text-gray-500">
              <p className="font-semibold">No properties added for comparison.</p>
              <button onClick={() => setActiveTab('discover')} className="mt-2 text-xs text-blue-600 font-semibold hover:underline">
                Browse properties and click Compare
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto bg-white rounded-2xl border border-gray-200 shadow-sm p-4">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="p-3 text-gray-500 font-bold w-48">Feature</th>
                    {compareDetails.map((p) => (
                      <th key={p.id} className="p-3 font-bold text-gray-900 min-w-[200px]">
                        {p.title}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  <tr>
                    <td className="p-3 font-semibold text-gray-700">Monthly Rent</td>
                    {compareDetails.map((p) => (
                      <td key={p.id} className="p-3 font-bold text-blue-600">₹{p.monthlyRentFrom?.toLocaleString()}</td>
                    ))}
                  </tr>
                  <tr>
                    <td className="p-3 font-semibold text-gray-700">City & Locality</td>
                    {compareDetails.map((p) => (
                      <td key={p.id} className="p-3 text-gray-600">{p.locality}, {p.city}</td>
                    ))}
                  </tr>
                  <tr>
                    <td className="p-3 font-semibold text-gray-700">Property Type</td>
                    {compareDetails.map((p) => (
                      <td key={p.id} className="p-3 text-gray-600">{p.propertyType}</td>
                    ))}
                  </tr>
                  <tr>
                    <td className="p-3 font-semibold text-gray-700">TrustScore</td>
                    {compareDetails.map((p) => (
                      <td key={p.id} className="p-3 font-bold text-purple-700">{p.trustScore} / 100</td>
                    ))}
                  </tr>
                  <tr>
                    <td className="p-3 font-semibold text-gray-700">Power Backup</td>
                    {compareDetails.map((p) => (
                      <td key={p.id} className="p-3 font-semibold text-emerald-600">{p.powerBackup ? 'Yes' : 'No'}</td>
                    ))}
                  </tr>
                  <tr>
                    <td className="p-3 font-semibold text-gray-700">Est. Vacancy</td>
                    {compareDetails.map((p) => (
                      <td key={p.id} className="p-3 text-amber-700 font-medium">{p.vacancyPrediction?.predictedDays || 21} days</td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </main>
      )}

      {/* OWNER DASHBOARD TAB */}
      {activeTab === 'owner_dashboard' && (
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Owner Dashboard</h1>
              <p className="text-xs text-gray-500">Manage your subscription, listings, and tenant bookings.</p>
            </div>
            <button
              onClick={() => setShowAddPropertyModal(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-4 py-2 rounded-lg shadow-sm"
            >
              + Add New Property
            </button>
          </div>

          {/* Owner Subscription Status Card (Sections 70, 97) */}
          {ownerSubscription && (
            <div className="bg-gradient-to-r from-slate-900 to-indigo-950 p-6 rounded-2xl text-white mb-8 shadow-md flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-400/30 uppercase">
                    Plan: {ownerSubscription.plan}
                  </span>
                  <span className={`px-2.5 py-0.5 rounded text-[10px] font-bold uppercase ${ownerSubscription.status === 'ACTIVE' || ownerSubscription.status === 'TRIAL' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/30' : 'bg-red-500/20 text-red-300 border border-red-400/30'}`}>
                    Status: {ownerSubscription.status}
                  </span>
                </div>
                <h3 className="text-xl font-bold mt-2">
                  {ownerSubscription.status === 'TRIAL' ? `${ownerSubscription.daysRemaining} days left in Free Trial` : `Livora ${ownerSubscription.plan} Plan`}
                </h3>
                <p className="text-xs text-slate-300 mt-1">
                  Active Listings: <strong>{ownerSubscription.propertiesUsed} / {ownerSubscription.propertiesLimit}</strong> allowed
                </p>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => setDemoPaymentModal({ open: true, plan: 'PRO', price: 199 })}
                  className="bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold px-4 py-2.5 rounded-lg shadow-sm"
                >
                  Upgrade to Pro (₹199)
                </button>
              </div>
            </div>
          )}

          {/* Analytics Cards */}
          {ownerAnalytics && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
              <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                <p className="text-xs text-gray-500">Total Properties</p>
                <p className="text-2xl font-extrabold text-gray-900">{ownerAnalytics.totalProperties}</p>
              </div>
              <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                <p className="text-xs text-gray-500">Occupancy Rate</p>
                <p className="text-2xl font-extrabold text-blue-600">{ownerAnalytics.occupancyRate}%</p>
              </div>
              <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                <p className="text-xs text-gray-500">Monthly Revenue</p>
                <p className="text-2xl font-extrabold text-emerald-600">₹{ownerAnalytics.monthlyRevenue?.toLocaleString()}</p>
              </div>
              <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                <p className="text-xs text-gray-500">Total Bookings</p>
                <p className="text-2xl font-extrabold text-purple-600">{ownerAnalytics.totalBookings}</p>
              </div>
            </div>
          )}

          {/* Managed Properties */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
            <h3 className="font-bold text-gray-900 text-base mb-4">My Managed Properties</h3>
            <div className="space-y-4">
              {ownerProperties.map((p) => (
                <div key={p.id} className="p-4 bg-gray-50 rounded-xl border border-gray-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 text-xs">
                  <div>
                    <h4 className="font-bold text-gray-900 text-sm">{p.title}</h4>
                    <p className="text-gray-500">{p.locality}, {p.city} • Rent: ₹{p.monthlyRentFrom.toLocaleString()}/mo</p>
                    <span className={`inline-block mt-1 px-2 py-0.5 rounded font-semibold text-[10px] ${p.verificationStatus === 'VERIFIED' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                      Status: {p.verificationStatus}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </main>
      )}

      {/* ADMIN VERIFICATION & REVENUE TAB (Section 81, 98) */}
      {activeTab === 'admin' && (
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
          <h1 className="text-2xl font-bold text-gray-900">Admin Monetization & Verification Portal</h1>

          {/* Revenue Analytics Cards (Section 98) */}
          {adminRevenue && (
            <div>
              <h3 className="font-bold text-gray-900 text-base mb-4">Livora Revenue (Demo Data)</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
                  <p className="text-xs text-gray-500">Total Demo Revenue</p>
                  <p className="text-2xl font-extrabold text-emerald-600">₹{adminRevenue.totalRevenue?.toLocaleString()}</p>
                </div>
                <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
                  <p className="text-xs text-gray-500">Subscription Revenue</p>
                  <p className="text-2xl font-extrabold text-blue-600">₹{adminRevenue.subscriptionRevenue?.toLocaleString()}</p>
                </div>
                <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
                  <p className="text-xs text-gray-500">2% Booking Fee Revenue</p>
                  <p className="text-2xl font-extrabold text-purple-600">₹{adminRevenue.bookingFeeRevenue?.toLocaleString()}</p>
                </div>
                <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
                  <p className="text-xs text-gray-500">Active Subscribers</p>
                  <p className="text-2xl font-extrabold text-gray-900">{adminRevenue.activeSubscribers}</p>
                </div>
              </div>
            </div>
          )}

          {/* Pending Verifications */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
            <h3 className="font-bold text-gray-900 text-base mb-4">Pending Verification Requests ({adminVerifications.length})</h3>
            <div className="space-y-4">
              {adminVerifications.length === 0 ? (
                <p className="text-xs text-gray-500">No pending verification requests.</p>
              ) : (
                adminVerifications.map((v) => (
                  <div key={v.id} className="p-4 bg-gray-50 rounded-xl border border-gray-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 text-xs">
                    <div>
                      <h4 className="font-bold text-gray-900 text-sm">{v.property?.title}</h4>
                      <p className="text-gray-500">Owner: {v.owner?.name} ({v.owner?.email})</p>
                      <p className="text-gray-500">Location: {v.property?.locality}, {v.property?.city}</p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleVerifyProperty(v.propertyId)}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-4 py-2 rounded-lg text-xs"
                      >
                        Approve & Set Verified
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </main>
      )}

      {/* RENTER DASHBOARD TAB */}
      {activeTab === 'renter_dashboard' && (
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">Renter Dashboard</h1>
          <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
            <h3 className="font-bold text-gray-900 text-base mb-2">Welcome Back, {user?.name}!</h3>
            <p className="text-xs text-gray-500 mb-4">Manage your ₹0 brokerage bookings, saved properties, and roommate matches.</p>
            <div className="p-4 bg-blue-50 rounded-xl border border-blue-100 text-xs text-blue-800">
              <p className="font-bold">Active Booking Guarantee</p>
              <p className="mt-1">All bookings on Livora AI include ₹0 brokerage, 2% platform fee, and 100% verified property guarantee.</p>
            </div>
          </div>
        </main>
      )}

      {/* AUTH MODAL */}
      {showAuthModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white max-w-sm w-full rounded-2xl shadow-2xl p-6 border border-gray-200">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-gray-900">Login / Register</h3>
              <button onClick={() => setShowAuthModal(false)} className="text-gray-400 hover:text-gray-600">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            {/* Quick Demo Login Presets */}
            <div className="mb-4 p-3 bg-gray-50 rounded-xl border border-gray-200 text-xs">
              <p className="font-bold text-gray-700 mb-2">Quick Demo Accounts:</p>
              <div className="flex flex-col gap-1.5">
                <button
                  onClick={() => handleDemoQuickLogin('renter@demo.livora.ai', 'RENTER')}
                  className="bg-blue-50 hover:bg-blue-100 text-blue-700 py-1.5 px-3 rounded text-left font-semibold"
                >
                  ⚡ Demo Renter
                </button>
                <button
                  onClick={() => handleDemoQuickLogin('owner@demo.livora.ai', 'OWNER')}
                  className="bg-purple-50 hover:bg-purple-100 text-purple-700 py-1.5 px-3 rounded text-left font-semibold"
                >
                  ⚡ Demo Owner (PRO Plan)
                </button>
                <button
                  onClick={() => handleDemoQuickLogin('admin@demo.livora.ai', 'ADMIN')}
                  className="bg-red-50 hover:bg-red-100 text-red-700 py-1.5 px-3 rounded text-left font-semibold"
                >
                  ⚡ Demo Admin
                </button>
              </div>
            </div>

            <form onSubmit={handleLogin} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-gray-700 block mb-1">Email Address</label>
                <input
                  type="email"
                  value={authEmail}
                  onChange={(e) => setAuthEmail(e.target.value)}
                  className="w-full p-2.5 rounded-lg border border-gray-300 outline-none focus:border-blue-600"
                  required
                />
              </div>

              <div>
                <label className="font-semibold text-gray-700 block mb-1">Password</label>
                <input
                  type="password"
                  value={authPassword}
                  onChange={(e) => setAuthPassword(e.target.value)}
                  className="w-full p-2.5 rounded-lg border border-gray-300 outline-none focus:border-blue-600"
                  required
                />
              </div>

              <button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 rounded-lg shadow-sm"
              >
                Sign In
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-400 py-8 border-t border-slate-800 text-xs mt-12">
        <div className="max-w-7xl mx-auto px-4 text-center sm:flex sm:justify-between sm:text-left">
          <p>© 2026 Livora AI. Smart Rentals, Better Living. (₹0 Brokerage + 2% Fee)</p>
          <div className="mt-2 sm:mt-0 flex justify-center gap-4">
            <button onClick={() => setActiveTab('pricing')} className="hover:text-white">Owner Subscriptions</button>
            <a href="#" className="hover:text-white">Privacy Policy</a>
            <a href="#" className="hover:text-white">Terms of Service</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
