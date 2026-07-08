import Hotel from "../models/Hotel.js";
import cloudinary from "../config/cloudinary.js";
import Room from "../models/Room.js";
import Booking from "../models/Booking.js";

// Computes { [roomId]: { avgRating, reviewCount } } from real guest reviews
// (only visible ones from completed stays - see Booking.review). Used to
// attach honest rating data to room listings instead of a hardcoded number.
const getRoomRatings = async () => {
  const results = await Booking.aggregate([
    { $match: { "review.rating": { $exists: true }, "review.isVisible": { $ne: false } } },
    { $group: { _id: "$room", avgRating: { $avg: "$review.rating" }, reviewCount: { $sum: 1 } } },
  ]);

  const ratingsByRoom = {};
  results.forEach((r) => {
    ratingsByRoom[r._id] = {
      avgRating: Math.round(r.avgRating * 10) / 10, // one decimal place
      reviewCount: r.reviewCount,
    };
  });
  return ratingsByRoom;
};

const attachRatings = async (rooms) => {
  const ratingsByRoom = await getRoomRatings();
  return rooms.map((room) => {
    const roomObj = room.toObject();
    const rating = ratingsByRoom[room._id.toString()];
    roomObj.avgRating = rating?.avgRating || null;
    roomObj.reviewCount = rating?.reviewCount || 0;
    return roomObj;
  });
};

// api to create a new room
export const createRoom = async (req, res) => {
  try {
    const { roomType, description, pricePerNight, amenities, maxGuests } = req.body;
    const parsedMaxGuests = Number(maxGuests);

    if(!roomType || !description?.trim() || !pricePerNight || !amenities){
      return res.json({ success:false, message:"Room type, description, price, and amenities are required" });
    }
    if(!parsedMaxGuests || parsedMaxGuests < 1){
      return res.json({ success:false, message:"Maximum guests must be at least 1" });
    }
    if(!req.files?.length){
      return res.json({ success:false, message:"Please upload at least one room image" });
    }

    const parsedAmenities = JSON.parse(amenities);
    if(!Array.isArray(parsedAmenities) || parsedAmenities.length === 0){
      return res.json({ success:false, message:"Please select at least one amenity" });
    }

    const hotel = await Hotel.findOne({});

    if (!hotel) {
      return res.json({ success:false, message:"Hotel not found. Run server/seed/seedHotel.js first."});
    }

    let imageUrls = [];

    for (const file of req.files) {
      const result = await cloudinary.uploader.upload(file.path, {
        folder: "rooms",
      });
      imageUrls.push(result.secure_url);
    }

    const newRoom = await Room.create({
      hotel: hotel._id,   // ✅ NOW THIS EXISTS
      roomType,
      description: description.trim(),
      pricePerNight: +pricePerNight,
      maxGuests: parsedMaxGuests,
      amenities: parsedAmenities,
      images: imageUrls,
    });

    res.status(201).json({ success: true, message: "Room Created Successfully" });

  } catch (error) {
    console.log("CREATE ROOM ERROR:", error);
    res.status(500).json({ success:false, message:error.message });
  }
};

// api to get all rooms (public listing)

export const getRooms = async(req,res) =>{
    try {
      const rooms =  await Room.find({isAvailable: true}).populate("hotel").sort({createdAt:-1})
      const roomsWithRatings = await attachRatings(rooms);
          res.json({success: true, rooms: roomsWithRatings})
    } catch (error) {
          res.json({success: false, message: error.message})
    }
}

// api to get all rooms for the admin dashboard (no owner filter needed - single hotel)
// Restricted to admin via isAdmin middleware in roomRoutes.js

export const getAllRooms = async(req,res) =>{
     try {
      const rooms = await Room.find({}).populate("hotel").sort({createdAt:-1});
      const roomsWithRatings = await attachRatings(rooms);
        res.json({success: true, rooms: roomsWithRatings})
     } catch (error) {
        res.json({success: false, message: error.message})
     }
}

// Public/admin room calendar data. Returns bookings that block the room for
// a date range so the frontend can show a visual availability calendar.
// GET /api/rooms/:roomId/calendar?from=YYYY-MM-DD&to=YYYY-MM-DD
export const getRoomCalendar = async(req,res) => {
    try {
      const {roomId} = req.params;
      const from = req.query.from ? new Date(req.query.from) : new Date();
      const to = req.query.to ? new Date(req.query.to) : new Date(Date.now() + 120 * 24 * 60 * 60 * 1000);

      if(Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || from >= to){
        return res.json({success:false, message:"Invalid calendar date range"});
      }

      const room = await Room.findById(roomId);
      if(!room){
        return res.json({success:false, message:"Room not found"});
      }

      const bookings = await Booking.find({
        room: roomId,
        status: { $nin: ["cancelled", "no-show"] },
        checkInDate: {$lt: to},
        checkOutDate: {$gt: from},
      }).select("checkInDate checkOutDate status isPaid paymentMethod");

      const events = bookings.map((booking) => ({
        _id: booking._id,
        start: booking.checkInDate,
        end: booking.checkOutDate,
        status: booking.status,
        isPaid: booking.isPaid,
        paymentMethod: booking.paymentMethod,
      }));

      res.json({success:true, events});
    } catch (error) {
      res.json({success:false, message:error.message});
    }
}

// api to update room details from admin room manager
export const updateRoom = async(req,res) =>{
    try {
      const {roomId} = req.params;
      const {roomType, description, pricePerNight, amenities, maxGuests, isAvailable} = req.body;

      const room = await Room.findById(roomId);
      if(!room){
        return res.json({success:false, message:"Room not found"});
      }

      if(roomType !== undefined){
        if(!String(roomType).trim()) return res.json({success:false, message:"Room type is required"});
        room.roomType = String(roomType).trim();
      }

      if(description !== undefined){
        if(!String(description).trim()) return res.json({success:false, message:"Room description is required"});
        room.description = String(description).trim();
      }

      if(pricePerNight !== undefined){
        const parsedPrice = Number(pricePerNight);
        if(!parsedPrice || parsedPrice < 1) return res.json({success:false, message:"Price must be greater than 0"});
        room.pricePerNight = parsedPrice;
      }

      if(maxGuests !== undefined){
        const parsedGuests = Number(maxGuests);
        if(!parsedGuests || parsedGuests < 1) return res.json({success:false, message:"Maximum guests must be at least 1"});
        room.maxGuests = parsedGuests;
      }

      if(amenities !== undefined){
        if(!Array.isArray(amenities) || amenities.length === 0){
          return res.json({success:false, message:"Please select at least one amenity"});
        }
        room.amenities = amenities.map(item => String(item).trim()).filter(Boolean);
      }

      if(isAvailable !== undefined){
        room.isAvailable = Boolean(isAvailable);
      }

      await room.save();
      res.json({success:true, message:"Room updated successfully", room});
    } catch (error) {
      res.json({success:false, message:error.message});
    }
}

// api to delete a room. Rooms with booking history are protected so old
// bookings and reports do not lose their room reference.
export const deleteRoom = async(req,res) =>{
    try {
      const {roomId} = req.params;
      const room = await Room.findById(roomId);
      if(!room){
        return res.json({success:false, message:"Room not found"});
      }

      const bookingCount = await Booking.countDocuments({room: roomId});
      if(bookingCount > 0){
        return res.json({
          success:false,
          message:"This room has booking history. Turn availability off instead of deleting it.",
        });
      }

      await Room.findByIdAndDelete(roomId);
      res.json({success:true, message:"Room deleted successfully"});
    } catch (error) {
      res.json({success:false, message:error.message});
    }
}


// api to toggle availblity of a room

export const toggleRoomAvailblity = async(req,res) =>{
    try {
        const {roomId} = req.body;
        const roomData = await Room.findById(roomId);
        roomData.isAvailable = !roomData.isAvailable;
        
        await roomData.save();
        res.json({success:true, message:"Room availiblity updated"})
    } catch (error) {
        res.json({success: false, message: error.message})
    }
}
