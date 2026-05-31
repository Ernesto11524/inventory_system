"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.upload = void 0;
exports.uploadToCloudinary = uploadToCloudinary;
exports.deleteFromCloudinary = deleteFromCloudinary;
const cloudinary_1 = require("cloudinary");
const multer_1 = __importDefault(require("multer"));
const stream_1 = require("stream");
cloudinary_1.v2.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});
exports.upload = (0, multer_1.default)({
    storage: multer_1.default.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
    fileFilter: (_req, file, cb) => {
        if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype)) {
            cb(new Error('Only JPEG, PNG, and WebP images are allowed'));
            return;
        }
        cb(null, true);
    },
});
async function uploadToCloudinary(buffer, folder = 'inventory/products') {
    return new Promise((resolve, reject) => {
        const uploadStream = cloudinary_1.v2.uploader.upload_stream({
            folder,
            resource_type: 'image',
            transformation: [
                { width: 800, height: 800, crop: 'limit' },
                { quality: 'auto:good' },
                { format: 'webp' },
            ],
        }, (error, result) => {
            if (error)
                reject(error);
            else
                resolve(result.secure_url);
        });
        const readable = new stream_1.Readable();
        readable.push(buffer);
        readable.push(null);
        readable.pipe(uploadStream);
    });
}
async function deleteFromCloudinary(imageUrl) {
    try {
        // Extract public_id from URL
        const parts = imageUrl.split('/');
        const filename = parts[parts.length - 1].split('.')[0];
        const folder = parts.slice(-3, -1).join('/');
        await cloudinary_1.v2.uploader.destroy(`${folder}/${filename}`);
    }
    catch (err) {
        console.error('Failed to delete image from Cloudinary:', err);
    }
}
//# sourceMappingURL=cloudinary.js.map