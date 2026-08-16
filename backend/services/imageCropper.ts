/**
 * Image Cropping Service
 * Handles cropping image regions based on bounding boxes
 */

import sharp from 'sharp';
import { TemplateField } from '../../src/types/index.ts';

export interface CropRegion {
  x: number;      // pixels
  y: number;      // pixels
  width: number;  // pixels
  height: number; // pixels
}

export class ImageCropperService {
  /**
   * Crop an image region based on percentage-based bounding box
   * 
   * Bounding boxes in TemplateField use percentages (0-100):
   * - x, y: top-left corner as % of image width/height
   * - width, height: region size as % of image width/height
   * 
   * This converts to actual pixel coordinates and crops the image.
   */
  async cropRegion(
    base64ImageWithPrefix: string,
    field: TemplateField,
    imageWidth: number,
    imageHeight: number
  ): Promise<{
    croppedImageBase64: string;
    cropRegion: CropRegion;
    originalWidth: number;
    originalHeight: number;
  }> {
    // Parse bounding box (percentages relative to full image dimensions)
    const bboxPercent = field.boundingBox;
    
    // Convert percentage to pixel coordinates using formula:
    // pixelX = (x% / 100) * imageWidth
    // pixelY = (y% / 100) * imageHeight
    // pixelWidth = (width% / 100) * imageWidth
    // pixelHeight = (height% / 100) * imageHeight
    const pixelX = Math.round((bboxPercent.x / 100) * imageWidth);
    const pixelY = Math.round((bboxPercent.y / 100) * imageHeight);
    const pixelWidth = Math.round((bboxPercent.width / 100) * imageWidth);
    const pixelHeight = Math.round((bboxPercent.height / 100) * imageHeight);

    console.log(
      `[OCR-CROP] fieldKey="${field.fieldKey}" ` +
      `bbox_percent=(x:${bboxPercent.x}% y:${bboxPercent.y}% w:${bboxPercent.width}% h:${bboxPercent.height}%)`
    );
    console.log(
      `[OCR-CROP] fieldKey="${field.fieldKey}" ` +
      `coordinate_system=template_percent_of_full_image ` +
      `input_image_dimensions=${imageWidth}x${imageHeight}`
    );
    console.log(
      `[OCR-CROP] fieldKey="${field.fieldKey}" ` +
      `conversion_formula=[(x%/100)*width, (y%/100)*height, (w%/100)*width, (h%/100)*height] ` +
      `calculated_pixel_coords=(x:${pixelX} y:${pixelY} w:${pixelWidth} h:${pixelHeight})`
    );

    // Clamp coordinates to image bounds
    let croppedX = Math.max(0, pixelX);
    let croppedY = Math.max(0, pixelY);
    const croppedWidth = Math.min(pixelWidth, imageWidth - croppedX);
    const croppedHeight = Math.min(pixelHeight, imageHeight - croppedY);

    // Log what was actually extracted (after clamping)
    console.log(
      `[OCR-CROP] fieldKey="${field.fieldKey}" ` +
      `final_crop_after_clamping=(x:${croppedX} y:${croppedY} w:${croppedWidth} h:${croppedHeight}) ` +
      `clamped_from=(x:${pixelX} y:${pixelY} w:${pixelWidth} h:${pixelHeight})`
    );
    if (croppedX !== pixelX || croppedY !== pixelY || croppedWidth !== pixelWidth || croppedHeight !== pixelHeight) {
      console.warn(
        `[OCR-CROP] fieldKey="${field.fieldKey}" WARNING: Crop was clamped to image bounds ` +
        `(may indicate invalid template percentage or very small image)`
      );
    }

    // Validate crop dimensions
    if (croppedWidth <= 0 || croppedHeight <= 0) {
      throw new Error(
        `Invalid crop region for field "${field.fieldKey}": ` +
        `x=${croppedX} y=${croppedY} width=${croppedWidth} height=${croppedHeight} ` +
        `(image size=${imageWidth}x${imageHeight})`
      );
    }

    // Extract base64 data (remove data URI prefix if present)
    let base64Data = base64ImageWithPrefix;
    if (base64ImageWithPrefix.includes(',')) {
      base64Data = base64ImageWithPrefix.split(',')[1];
    }

    // Convert base64 to buffer
    const imageBuffer = Buffer.from(base64Data, 'base64');

    // Use sharp to crop the image, upscale 2x for optimal OCR neural net resolution, and add white padding
    let croppedBuffer = await sharp(imageBuffer)
      .extract({
        left: croppedX,
        top: croppedY,
        width: croppedWidth,
        height: croppedHeight
      })
      .resize({ height: Math.round(croppedHeight * 2), kernel: 'lanczos3' })
      .extend({ top: 15, bottom: 15, left: 15, right: 15, background: { r: 255, g: 255, b: 255 } })
      .toBuffer();

    // (No automatic heuristics applied here.)
    // Keep diagnostic logs and return the crop exactly calculated and clamped above.

    // Inspect final cropped buffer dimensions (after resize and padding)
    try {
      const outMeta = await sharp(croppedBuffer).metadata();
      const outW = outMeta.width || Math.round(croppedWidth * 2) + 30;
      const outH = outMeta.height || Math.round(croppedHeight * 2) + 30;
      console.log(
        `[OCR-CROP] fieldKey="${field.fieldKey}" clamped_crop=(x:${croppedX} y:${croppedY} w:${croppedWidth} h:${croppedHeight}) ` +
        `final_output=(w:${outW} h:${outH}) bytes=${croppedBuffer.length}`
      );
    } catch (metaErr) {
      console.warn('[OCR-CROP] could not read output crop metadata:', metaErr?.message || metaErr);
    }

    // Convert back to base64
    const croppedBase64 = croppedBuffer.toString('base64');

    return {
      croppedImageBase64: croppedBase64,
      cropRegion: {
        x: croppedX,
        y: croppedY,
        width: croppedWidth,
        height: croppedHeight
      },
      originalWidth: imageWidth,
      originalHeight: imageHeight
    };
  }

  /**
   * Get image dimensions from base64 string
   */
  async getImageDimensions(base64ImageWithPrefix: string): Promise<{ width: number; height: number }> {
    let base64Data = base64ImageWithPrefix;
    if (base64ImageWithPrefix.includes(',')) {
      base64Data = base64ImageWithPrefix.split(',')[1];
    }

    const buffer = Buffer.from(base64Data, 'base64');
    const metadata = await sharp(buffer).metadata();

    return {
      width: metadata.width || 1240,
      height: metadata.height || 1754
    };
  }
}

export const imageCropper = new ImageCropperService();
