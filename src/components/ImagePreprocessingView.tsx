import React, { useState } from 'react';
import { 
  Sliders, Eye, Cpu, RotateCw, Crop, Sun, Sparkles, AlertTriangle, CheckCircle2, RefreshCw, Zap
} from 'lucide-react';
import { ImageQualityMetrics } from '../types/index.ts';

export const ImagePreprocessingView: React.FC = () => {
  const [blurThreshold, setBlurThreshold] = useState<number>(100);
  const [minBrightness, setMinBrightness] = useState<number>(50);
  const [maxBrightness, setMaxBrightness] = useState<number>(240);
  const [enableDeskew, setEnableDeskew] = useState<boolean>(true);
  const [enablePerspective, setEnablePerspective] = useState<boolean>(true);
  const [enableClahe, setEnableClahe] = useState<boolean>(true);
  const [enableDenoise, setEnableDenoise] = useState<boolean>(true);

  // Simulated metrics state for interactive testing
  const [metrics, setMetrics] = useState<ImageQualityMetrics>({
    isBlurred: false,
    blurScore: 245.8,
    isDark: false,
    brightnessScore: 182.4,
    isOverexposed: false,
    isCutOff: false,
    rotationAngle: 0.8,
    resolutionDpi: 300,
    isAcceptable: true,
    qualityIssues: []
  });

  const [simulatedDeskewAngle, setSimulatedDeskewAngle] = useState<number>(0.8);
  const [processing, setProcessing] = useState<boolean>(false);

  const handleRunPreprocessing = async () => {
    setProcessing(true);
    setTimeout(() => {
      setProcessing(false);
      setSimulatedDeskewAngle(enableDeskew ? 0.0 : 0.8);
    }, 450);
  };

  return (
    <div className="space-y-6">
      {/* View Header */}
      <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <Sliders className="w-6 h-6 text-indigo-400" />
            <span>OpenCV Image Preprocessing Pipeline (Phase 3)</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Real-time OpenCV image quality gatekeeper: Blur, Brightness, Resolution, Deskew, 4-Point Perspective Warp, CLAHE Noise Filter & Cropping.
          </p>
        </div>

        <button
          onClick={handleRunPreprocessing}
          disabled={processing}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg text-xs transition flex items-center gap-2 shadow"
        >
          {processing ? (
            <RefreshCw className="w-4 h-4 animate-spin" />
          ) : (
            <Zap className="w-4 h-4" />
          )}
          <span>{processing ? 'Processing Pipeline...' : 'Run OpenCV Test Pipeline'}</span>
        </button>
      </div>

      {/* Preprocessing Features Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Blur Detection */}
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
              <Eye className="w-4 h-4 text-blue-400" />
              <span>1. Blur Detection</span>
            </span>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
              metrics.isBlurred ? 'bg-red-500/20 text-red-400' : 'bg-emerald-500/20 text-emerald-400'
            }`}>
              {metrics.isBlurred ? 'FAIL' : 'PASS'}
            </span>
          </div>
          <p className="text-[11px] text-slate-400">
            Laplacian Variance: <strong className="text-slate-100">{metrics.blurScore}</strong> (Min: {blurThreshold})
          </p>
          <div className="w-full bg-slate-950 h-1.5 rounded-full overflow-hidden border border-slate-800">
            <div 
              className={`h-full ${metrics.blurScore >= blurThreshold ? 'bg-emerald-500' : 'bg-red-500'}`}
              style={{ width: `${Math.min(100, (metrics.blurScore / 350) * 100)}%` }}
            />
          </div>
        </div>

        {/* 2. Brightness Detection */}
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
              <Sun className="w-4 h-4 text-amber-400" />
              <span>2. Brightness Detection</span>
            </span>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
              metrics.isDark || metrics.isOverexposed ? 'bg-red-500/20 text-red-400' : 'bg-emerald-500/20 text-emerald-400'
            }`}>
              {metrics.isDark ? 'DARK' : metrics.isOverexposed ? 'GLARE' : 'OPTIMAL'}
            </span>
          </div>
          <p className="text-[11px] text-slate-400">
            Mean Lightness: <strong className="text-slate-100">{metrics.brightnessScore}</strong> (Range: {minBrightness}-{maxBrightness})
          </p>
          <div className="w-full bg-slate-950 h-1.5 rounded-full overflow-hidden border border-slate-800">
            <div 
              className="bg-amber-400 h-full"
              style={{ width: `${(metrics.brightnessScore / 255) * 100}%` }}
            />
          </div>
        </div>

        {/* 3. Deskew & Rotation */}
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
              <RotateCw className="w-4 h-4 text-indigo-400" />
              <span>3. Deskew Matrix</span>
            </span>
            <span className="text-[10px] font-bold bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded">
              {enableDeskew ? 'ENABLED' : 'OFF'}
            </span>
          </div>
          <p className="text-[11px] text-slate-400">
            Current Skew Angle: <strong className="text-indigo-300">{simulatedDeskewAngle}°</strong>
          </p>
          <p className="text-[10px] text-slate-500">Hough lines orientation correction</p>
        </div>

        {/* 4. Perspective Correction */}
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
              <Crop className="w-4 h-4 text-emerald-400" />
              <span>4. 4-Point Unwarp</span>
            </span>
            <span className="text-[10px] font-bold bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded">
              {enablePerspective ? 'ACTIVE' : 'OFF'}
            </span>
          </div>
          <p className="text-[11px] text-slate-400">
            Document Corner BBox: <strong className="text-emerald-400">Homography 3D</strong>
          </p>
          <p className="text-[10px] text-slate-500">Auto-flattens angled mobile camera scans</p>
        </div>
      </div>

      {/* Interactive Controls & Code Specs */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Toggle Controls */}
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl space-y-4">
          <h3 className="text-sm font-bold text-slate-200 border-b border-slate-800 pb-3 flex items-center gap-2">
            <Cpu className="w-4 h-4 text-blue-400" />
            <span>Preprocessing Module Parameters</span>
          </h3>

          <div className="space-y-3 text-xs">
            <div className="flex items-center justify-between p-3 bg-slate-950 border border-slate-800 rounded-lg">
              <div>
                <div className="font-semibold text-slate-200">Hough Deskew Correction</div>
                <div className="text-[10px] text-slate-500">Straightens text baseline lines</div>
              </div>
              <input
                type="checkbox"
                checked={enableDeskew}
                onChange={(e) => setEnableDeskew(e.target.checked)}
                className="w-4 h-4 rounded accent-indigo-600"
              />
            </div>

            <div className="flex items-center justify-between p-3 bg-slate-950 border border-slate-800 rounded-lg">
              <div>
                <div className="font-semibold text-slate-200">Perspective Unwarp (Perspective Warp)</div>
                <div className="text-[10px] text-slate-500">Quadrilateral document corner detection</div>
              </div>
              <input
                type="checkbox"
                checked={enablePerspective}
                onChange={(e) => setEnablePerspective(e.target.checked)}
                className="w-4 h-4 rounded accent-indigo-600"
              />
            </div>

            <div className="flex items-center justify-between p-3 bg-slate-950 border border-slate-800 rounded-lg">
              <div>
                <div className="font-semibold text-slate-200">CLAHE Contrast Enhancement</div>
                <div className="text-[10px] text-slate-500">Adaptive histogram equalization (clipLimit=2.0)</div>
              </div>
              <input
                type="checkbox"
                checked={enableClahe}
                onChange={(e) => setEnableClahe(e.target.checked)}
                className="w-4 h-4 rounded accent-indigo-600"
              />
            </div>

            <div className="flex items-center justify-between p-3 bg-slate-950 border border-slate-800 rounded-lg">
              <div>
                <div className="font-semibold text-slate-200">Non-Local Means Denoising</div>
                <div className="text-[10px] text-slate-500">Removes paper grain and shadow artifacts</div>
              </div>
              <input
                type="checkbox"
                checked={enableDenoise}
                onChange={(e) => setEnableDenoise(e.target.checked)}
                className="w-4 h-4 rounded accent-indigo-600"
              />
            </div>
          </div>
        </div>

        {/* Python/OpenCV Implementation Spec Code */}
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl space-y-3">
          <h3 className="text-sm font-bold text-slate-200 border-b border-slate-800 pb-3 flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>Python OpenCV Execution Spec</span>
            </span>
            <span className="text-[10px] text-slate-500 font-mono">backend/python_backend/image_processor.py</span>
          </h3>

          <pre className="bg-slate-950 p-3.5 rounded-lg font-mono text-[11px] text-blue-300 leading-relaxed border border-slate-800 overflow-x-auto">
{`# OpenCV Laplacian Blur & Hough Deskew
def process_pipeline(image_path):
    img = cv2.imread(image_path)
    
    # 1. Blur Assessment
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    blur_score = cv2.Laplacian(gray, cv2.CV_64F).var()
    
    # 2. Deskew
    angle = calculate_skew_angle(img)
    rotated = deskew(img, angle)
    
    # 3. 4-Point Perspective Warp
    warped, _ = perspective_correction(rotated)
    
    # 4. CLAHE Contrast & Denoising
    clahe = cv2.createCLAHE(clipLimit=2.0)
    enhanced = clahe.apply(warped)
    return enhanced`}</pre>
        </div>
      </div>
    </div>
  );
};
