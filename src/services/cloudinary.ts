import { v2 as cloudinary } from 'cloudinary';

// Configure Cloudinary
// Support both individual credentials and single URL format
if (process.env.CLOUDINARY_URL) {
  // Single URL format: cloudinary://api_key:api_secret@cloud_name
  cloudinary.config(process.env.CLOUDINARY_URL);
} else {
  // Individual credentials format
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
}

export interface CloudinaryUploadResult {
  public_id: string;
  secure_url: string;
  format: string;
  width: number;
  height: number;
  bytes: number;
}

export async function uploadImageToCloudinary(
  imageBase64: string,
  folder: string = 'crm-profiles'
): Promise<CloudinaryUploadResult> {
  try {
    // Check if Cloudinary is configured
    const config = cloudinary.config();
    if (!config.cloud_name || !config.api_key || !config.api_secret) {
      throw new Error('Cloudinary configuration is incomplete. Please check your environment variables.');
    }

    const result = await cloudinary.uploader.upload(imageBase64, {
      folder,
      resource_type: 'image',
      transformation: [
        { width: 400, height: 400, crop: 'fill', gravity: 'face' },
        { quality: 'auto', fetch_format: 'auto' }
      ],
    });

    return {
      public_id: result.public_id,
      secure_url: result.secure_url,
      format: result.format,
      width: result.width,
      height: result.height,
      bytes: result.bytes,
    };
  } catch (error) {
    console.error('Cloudinary upload error:', error);
    throw new Error('Failed to upload image to Cloudinary');
  }
}

export async function deleteImageFromCloudinary(publicId: string): Promise<void> {
  try {
    await cloudinary.uploader.destroy(publicId);
  } catch (error) {
    console.error('Cloudinary delete error:', error);
    // Don't throw error for delete failures as it's not critical
  }
}

export default cloudinary;
