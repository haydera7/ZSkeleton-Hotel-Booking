import express from "express";
import upload from "../middleware/uploadMiddleware.js";
import { protect, isAdmin, isBookingStaff } from "../middleware/authMiddleware.js";
import { createRoom, deleteRoom, getAllRooms, getRoomCalendar, getRooms, toggleRoomAvailblity, updateRoom } from "../controllers/roomController.js";

const roomRouter = express.Router();

roomRouter.post('/',protect, isAdmin, upload.array("images",4), createRoom);
roomRouter.get('/', getRooms);
roomRouter.get('/:roomId/calendar', getRoomCalendar);
roomRouter.get('/admin',protect, isBookingStaff, getAllRooms );
roomRouter.put('/:roomId',protect, isAdmin, updateRoom);
roomRouter.delete('/:roomId',protect, isAdmin, deleteRoom);
roomRouter.post('/toggle-availbility',protect, isBookingStaff, toggleRoomAvailblity );

export default  roomRouter;
