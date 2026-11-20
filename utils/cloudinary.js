import { v2 as cloudinary } from 'cloudinary';
import ApiError from './ApiError.js';

let configured = false;
const configure = () => {
  if (configured) return;
  const { CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET } = process.env;
  if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) {
    throw new ApiError(503, 'Image uploads are not configured. Set the CLOUDINARY_* variables in server/.env');
  }
  cloudinary.config({
    cloud_name: CLOUDINARY_CLOUD_NAME,
    api_key: CLOUDINARY_API_KEY,
    api_secret: CLOUDINARY_API_SECRET,
    secure: true,
  });
  configured = true;
};

export const uploadBuffer = (buffer, folder = '') =>
  new Promise((resolve, reject) => {
    try {
      configure();
    } catch (e) {
      return reject(e);
    }
    const base = process.env.CLOUDINARY_FOLDER || 'lumora';
    const stream = cloudinary.uploader.upload_stream(
      { folder: folder ? `${base}/${folder}` : base, resource_type: 'image' },
      (err, result) => (err ? reject(err) : resolve({ url: result.secure_url, publicId: result.public_id }))
    );
    stream.end(buffer);
  });

export const destroyImages = async (publicIds = []) => {
  const ids = publicIds.filter(Boolean);
  if (!ids.length) return;
  try {
    configure();
    await Promise.all(ids.map((id) => cloudinary.uploader.destroy(id)));
  } catch (e) {
    console.warn('Cloudinary cleanup failed:', e.message);
  }
};
