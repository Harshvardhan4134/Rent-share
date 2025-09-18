const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || "demo-cloud";
const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || "demo-preset";

export interface CloudinaryUploadResult {
  secure_url: string;
  public_id: string;
  width: number;
  height: number;
}

export const uploadToCloudinary = async (
  file: File,
  folder?: string
): Promise<CloudinaryUploadResult> => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', UPLOAD_PRESET);
  
  if (folder) {
    formData.append('folder', folder);
  }

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/upload`,
    {
      method: 'POST',
      body: formData,
    }
  );

  if (!response.ok) {
    throw new Error('Upload failed');
  }

  return response.json();
};

export const uploadMultipleImages = async (
  files: File[],
  folder?: string
): Promise<string[]> => {
  const uploadPromises = files.map(file => uploadToCloudinary(file, folder));
  const results = await Promise.all(uploadPromises);
  return results.map(result => result.secure_url);
};
