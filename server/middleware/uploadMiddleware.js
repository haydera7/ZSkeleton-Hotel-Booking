import multer from "multer";

const upload = multer({storage: multer.diskStorage({})})


export default upload;





// i can use this it creates uploads folder in this project folder

// import multer from "multer";
// import path from "path";
// import fs from "fs";

// const uploadPath = "uploads";

// // create uploads folder if not exists
// if (!fs.existsSync(uploadPath)) {
//   fs.mkdirSync(uploadPath);
// }

// const storage = multer.diskStorage({
//   destination: function (req, file, cb) {
//     cb(null, uploadPath);
//   },
//   filename: function (req, file, cb) {
//     const uniqueName =
//       Date.now() + "-" + Math.round(Math.random() * 1e9) +
//       path.extname(file.originalname);
//     cb(null, uniqueName);
//   },
// });

// const fileFilter = (req, file, cb) => {
//   if (file.mimetype.startsWith("image/")) {
//     cb(null, true);
//   } else {
//     cb(new Error("Only image files allowed"), false);
//   }
// };

// const upload = multer({
//   storage,
//   fileFilter,
//   limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
// });

// export default upload;