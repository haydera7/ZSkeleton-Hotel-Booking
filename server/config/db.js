import mongoose from "mongoose";

let isConnected = false;

const  connectDB = async () => {

    //   if (isConnected) {
    //     return;
    // }
      try {
        mongoose.connection.on('connected', ()=> console.log("Database connected"));
           await mongoose.connect(`${process.env.MONGODB_URI}/hotel-booking`)
      } 

    // try {

    //     const db = await mongoose.connect(
    //         `${process.env.MONGODB_URI}/hotel-booking`
    //     );

    //     isConnected = db.connections[0].readyState;

    //     console.log("Database connected");

    // }
      catch (error) {
          console.log(error.message)
      }
}


export default connectDB;