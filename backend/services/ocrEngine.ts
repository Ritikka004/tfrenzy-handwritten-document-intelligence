/**
 * Modular & Replaceable OCR Service Interface & Implementation
 * Follows Strategy Pattern allowing zero-downtime model swap
 */

import { OCRPrediction, ImageQualityMetrics } from '../../src/types/index.ts';

export interface ImagePreprocessingConfig {
  enableDeskew: boolean;
  enableClahe: boolean;
  enablePerspectiveCorrection: boolean;
  enableNoiseRemoval: boolean;
}

export interface IOCRService {
  name: string;
  version: string;
  architecture: string;
  isEdgeCompatible: boolean;

  assessImageQuality(imageBuffer: Buffer | string): Promise<ImageQualityMetrics>;
  preprocessImage(imageBuffer: Buffer | string, config: ImagePreprocessingConfig): Promise<{
    processedBuffer: string;
    deskewAngle: number;
  }>;
  recognizeRegion(
    croppedImage: string,
    fieldKey: string,
    expectedType?: string
  ): Promise<OCRPrediction>;
}

export class PaddleOCRService implements IOCRService {
  public name = 'PaddleOCR Mobile Edge';
  public version = 'PP-OCRv6';
  public architecture = 'MobileNetV3-CRNN';
  public isEdgeCompatible = true;

  async assessImageQuality(imageBuffer: Buffer | string): Promise<ImageQualityMetrics> {
    // Simulated OpenCV Laplacian variance blur & histogram assessment
    const size = typeof imageBuffer === 'string' ? imageBuffer.length : imageBuffer.length;
    const blurScore = Math.min(350, Math.max(40, Math.floor(size % 300 + 150)));
    const brightnessScore = 185.0;

    const isBlurred = blurScore < 100;
    const isDark = brightnessScore < 50;
    const isOverexposed = brightnessScore > 240;

    return {
      isBlurred,
      blurScore,
      isDark,
      brightnessScore,
      isOverexposed,
      isCutOff: false,
      rotationAngle: 0.5,
      resolutionDpi: 300,
      isAcceptable: !isBlurred && !isDark && !isOverexposed,
      qualityIssues: isBlurred ? ['Image is too blurry. High Laplacian variance detected.'] : []
    };
  }

  async preprocessImage(imageBuffer: Buffer | string, config: ImagePreprocessingConfig) {
    return {
      processedBuffer: typeof imageBuffer === 'string' ? imageBuffer : imageBuffer.toString('base64'),
      deskewAngle: 0.5
    };
  }

  async recognizeRegion(
    croppedImage: string,
    fieldKey: string,
    expectedType?: string
  ): Promise<OCRPrediction> {
    const startTime = Date.now();

    // Default fast edge recognition simulation
    let predictedText = 'Sample Entry';
    let confidence = 0.92;

    if (fieldKey.includes('name')) {
      predictedText = 'Amit Kumar';
      confidence = 0.88;
    } else if (fieldKey.includes('phone') || fieldKey.includes('mobile')) {
      predictedText = '9876543210';
      confidence = 0.97;
    } else if (fieldKey.includes('date')) {
      predictedText = '2026-08-04';
      confidence = 0.95;
    } else if (fieldKey.includes('employee')) {
      predictedText = 'EMP-4092';
      confidence = 0.89;
    } else if (fieldKey.includes('vehicle')) {
      predictedText = 'KA01AB1234';
      confidence = 0.82;
    } else if (fieldKey.includes('quantity')) {
      predictedText = '2';
      confidence = 0.98;
    }

    return {
      id: `pred-pad-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      regionId: `reg-${fieldKey}`,
      fieldKey,
      modelName: this.name,
      modelVersion: this.version,
      rawText: predictedText,
      cleanedText: predictedText,
      confidence,
      processingTimeMs: Date.now() - startTime + 85
    };
  }
}

export class TrOCRService implements IOCRService {
  public name = 'TrOCR Transformer';
  public version = 'v1.3-deep';
  public architecture = 'Vision-Encoder-Decoder-Transformer';
  public isEdgeCompatible = true;

  async assessImageQuality(imageBuffer: Buffer | string): Promise<ImageQualityMetrics> {
    return {
      isBlurred: false,
      blurScore: 310,
      isDark: false,
      brightnessScore: 190,
      isOverexposed: false,
      isCutOff: false,
      rotationAngle: 0.0,
      resolutionDpi: 300,
      isAcceptable: true,
      qualityIssues: []
    };
  }

  async preprocessImage(imageBuffer: Buffer | string, config: ImagePreprocessingConfig) {
    return {
      processedBuffer: typeof imageBuffer === 'string' ? imageBuffer : imageBuffer.toString('base64'),
      deskewAngle: 0.0
    };
  }

  async recognizeRegion(
    croppedImage: string,
    fieldKey: string,
    expectedType?: string
  ): Promise<OCRPrediction> {
    const startTime = Date.now();

    let predictedText = 'TrOCR High Accuracy Output';
    let confidence = 0.96;

    if (fieldKey.includes('name')) {
      predictedText = 'Amit Kumar';
      confidence = 0.97;
    } else if (fieldKey.includes('phone') || fieldKey.includes('mobile')) {
      predictedText = '9876543210';
      confidence = 0.99;
    } else if (fieldKey.includes('date')) {
      predictedText = '2026-08-04';
      confidence = 0.98;
    } else if (fieldKey.includes('employee')) {
      predictedText = 'EMP-4092';
      confidence = 0.96;
    } else if (fieldKey.includes('vehicle')) {
      predictedText = 'KA01AB1234';
      confidence = 0.94;
    }

    return {
      id: `pred-trocr-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      regionId: `reg-${fieldKey}`,
      fieldKey,
      modelName: this.name,
      modelVersion: this.version,
      rawText: predictedText,
      cleanedText: predictedText,
      confidence,
      processingTimeMs: Date.now() - startTime + 320
    };
  }
}

export class HybridOCRManager {
  private edgeEngine: IOCRService = new PaddleOCRService();
  private deepEngine: IOCRService = new TrOCRService();

  public async processRegionWithCascading(
    croppedImage: string,
    fieldKey: string,
    expectedType?: string
  ): Promise<{ prediction: OCRPrediction; escalated: boolean }> {
    // Stage 1: Fast Edge OCR Model (PaddleOCR)
    const edgeResult = await this.edgeEngine.recognizeRegion(croppedImage, fieldKey, expectedType);

    // If confidence is high (>= 0.85), accept fast edge result immediately
    if (edgeResult.confidence >= 0.85) {
      return { prediction: edgeResult, escalated: false };
    }

    // Otherwise, escalate to stronger Vision Transformer (TrOCR)
    const deepResult = await this.deepEngine.recognizeRegion(croppedImage, fieldKey, expectedType);
    return { prediction: deepResult, escalated: true };
  }
}
