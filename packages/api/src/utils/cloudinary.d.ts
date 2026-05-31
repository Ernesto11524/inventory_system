import multer from 'multer';
export declare const upload: multer.Multer;
export declare function uploadToCloudinary(buffer: Buffer, folder?: string): Promise<string>;
export declare function deleteFromCloudinary(imageUrl: string): Promise<void>;
//# sourceMappingURL=cloudinary.d.ts.map