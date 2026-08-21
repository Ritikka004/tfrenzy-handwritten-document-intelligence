import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Upload, CheckCircle2, RefreshCw, ArrowRight, AlertTriangle,
  Camera, X, RotateCcw, ImagePlus
} from 'lucide-react';
import { DocumentType, Document } from '../types/index.ts';

interface UploadViewProps {
  documentTypes: DocumentType[];
  onUploadSuccess: (doc: Document) => void;
  onNavigateToQueue: () => void;
}

export const UploadView: React.FC<UploadViewProps> = ({
  documentTypes,
  onUploadSuccess,
  onNavigateToQueue
}) => {
  const [selectedTypeId, setSelectedTypeId] = useState<string>(documentTypes[0]?.id || 'dt-visitor');
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadResult, setUploadResult] = useState<Document | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState<boolean>(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // ── Camera state ──────────────────────────────────────────────────────────
  const [showCamera, setShowCamera] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [capturedDataUrl, setCapturedDataUrl] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Stop camera stream helper
  const stopStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
  }, []);

  // Cleanup stream on unmount
  useEffect(() => () => stopStream(), [stopStream]);

  // Open camera
  const openCamera = async () => {
    setCapturedDataUrl(null);
    setCameraError(null);
    setShowCamera(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch {
      setCameraError('Camera access denied or not available. Please allow camera permissions and try again.');
      stopStream();
    }
  };

  // Close camera modal
  const closeCamera = () => {
    stopStream();
    setCapturedDataUrl(null);
    setCameraError(null);
    setShowCamera(false);
  };

  // Capture a photo frame
  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    canvas.getContext('2d')?.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
    setCapturedDataUrl(dataUrl);
    stopStream(); // stop live stream after capture
  };

  // Retake — re-open camera stream
  const retakePhoto = async () => {
    setCapturedDataUrl(null);
    setCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch {
      setCameraError('Camera access denied or not available.');
      stopStream();
    }
  };

  // Use captured photo — convert canvas to File, inject into existing upload flow
  const useCapturedPhoto = () => {
    if (!canvasRef.current) return;
    canvasRef.current.toBlob((blob) => {
      if (!blob) return;
      const fileName = `camera_capture_${Date.now()}.jpg`;
      const file = new File([blob], fileName, { type: 'image/jpeg' });
      setSelectedFile(file);
      setErrorMessage(null);
      closeCamera();
    }, 'image/jpeg', 0.92);
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      setErrorMessage("Please select a file first.");
      return;
    }

    setIsUploading(true);
    setUploadResult(null);
    setErrorMessage(null);

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("documentTypeId", selectedTypeId);

      const res = await fetch("/api/documents/upload", {
        method: "POST",
        body: formData,
      });

      const json = await res.json();
      if (json.success && json.data?.document) {
        setUploadResult(json.data.document);
        onUploadSuccess(json.data.document);
        setSelectedFile(null);
      } else {
        setErrorMessage(json.error || "File upload failed.");
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Network error occurred while uploading document.");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl shadow-md">
        <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2">
          Document Ingestion &amp; Image Quality Gatekeeper
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Upload handwritten form images or capture via camera. Automated OpenCV checks evaluate blur, brightness, contrast, and deskew angle.
        </p>

        {/* Form Type Selector */}
        <div className="mt-6 space-y-2">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-300">
            Select Document Category / Template
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {documentTypes.map((dt) => (
              <button
                key={dt.id}
                onClick={() => setSelectedTypeId(dt.id)}
                className={`p-3 rounded-lg border text-left text-xs transition-all ${
                  selectedTypeId === dt.id
                    ? 'border-blue-500 bg-blue-950/40 text-blue-300 font-bold'
                    : 'border-slate-800 bg-slate-950 hover:border-slate-700 text-slate-400'
                }`}
              >
                <div className="font-semibold text-slate-200">{dt.name}</div>
                <div className="text-[10px] text-slate-500 mt-0.5">{dt.code}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Visible Error Banner */}
        {errorMessage && (
          <div className="mt-4 p-3 bg-red-500/20 border border-red-500/40 rounded-lg flex items-center gap-2 text-xs font-semibold text-red-300">
            <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Drop Zone */}
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragActive(true);
          }}
          onDragLeave={() => setDragActive(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragActive(false);

            if (e.dataTransfer.files.length > 0) {
              setSelectedFile(e.dataTransfer.files[0]);
              setErrorMessage(null);
            }
          }}
          className={`mt-6 border-2 border-dashed rounded-xl p-8 text-center transition-all ${
            dragActive
              ? "border-blue-500 bg-blue-950/20"
              : "border-slate-800 bg-slate-950/50 hover:border-slate-700"
          }`}
        >
          {isUploading ? (
            <div className="py-8 space-y-3">
              <RefreshCw className="w-8 h-8 text-blue-400 animate-spin mx-auto" />
              <p className="text-xs font-bold text-slate-200">
                Uploading Document to Storage &amp; Registering Metadata...
              </p>
              <p className="text-[11px] text-slate-500">
                Please wait while the server stores your document.
              </p>
            </div>
          ) : (
            <div className="space-y-5">
              {/* Upload Icon */}
              <div className="w-14 h-14 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center mx-auto">
                <Upload className="w-7 h-7 text-blue-400" />
              </div>

              {/* Title */}
              <div>
                <p className="text-lg font-semibold text-slate-200">
                  Drag &amp; Drop Document
                </p>

                <p className="text-sm text-slate-500 mt-1">
                  PNG, JPG, JPEG or PDF (Maximum 15 MB)
                </p>
              </div>

              {/* Hidden File Picker */}
              <input
                id="real-upload"
                type="file"
                accept=".png,.jpg,.jpeg,.pdf"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files.length > 0) {
                    setSelectedFile(e.target.files[0]);
                    setErrorMessage(null);
                  }
                }}
              />

              {/* Choose File Button */}
              <label
                htmlFor="real-upload"
                className="inline-flex items-center gap-2 cursor-pointer px-5 py-3 bg-blue-600 hover:bg-blue-500 rounded-lg text-white font-semibold transition shadow-lg"
              >
                <Upload className="w-4 h-4" />
                Choose File
              </label>

              {/* Use Camera Button */}
              <button
                type="button"
                onClick={openCamera}
                className="inline-flex items-center gap-2 cursor-pointer px-5 py-3 bg-slate-700 hover:bg-slate-600 border border-slate-600 hover:border-slate-500 rounded-lg text-slate-200 font-semibold transition shadow-lg"
              >
                <Camera className="w-4 h-4 text-blue-400" />
                Use Camera
              </button>

              {/* Selected File */}
              {selectedFile && (
                <div className="bg-slate-900 border border-slate-700 rounded-lg p-3 max-w-md mx-auto">
                  <p className="text-xs text-slate-400">
                    Selected File
                  </p>

                  <p className="text-sm font-semibold text-green-400 mt-1 break-all">
                    {selectedFile.name}
                  </p>

                  <p className="text-xs text-slate-500 mt-1">
                    {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
              )}

              {/* Upload Button */}
              <button
                onClick={handleUpload}
                disabled={!selectedFile}
                className={`px-6 py-2 rounded-lg font-semibold transition ${
                  selectedFile
                    ? "bg-green-600 hover:bg-green-500 text-white shadow-md cursor-pointer"
                    : "bg-slate-700 text-slate-400 cursor-not-allowed"
                }`}
              >
                Upload Selected File
              </button>
            </div>
          )}
        </div>

        {/* Upload Result Feedback */}
        {uploadResult && (
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                <span>Document Storage &amp; Registration Complete</span>
              </h2>
              <span className={`text-xs px-2.5 py-1 rounded-full font-bold uppercase ${
                uploadResult.status === 'uploaded'
                  ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                  : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
              }`}>
                {uploadResult.status.replace(/_/g, ' ')}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-950 p-4 rounded-lg text-xs">
              <div>
                <span className="text-slate-500">File Name:</span>
                <p className="font-semibold text-slate-200">{uploadResult.fileName}</p>
              </div>
              <div>
                <span className="text-slate-500">Document ID:</span>
                <p className="font-semibold text-indigo-400 font-mono">{uploadResult.id}</p>
              </div>
              <div>
                <span className="text-slate-500">Uploaded At:</span>
                <p className="font-semibold text-slate-300">{new Date(uploadResult.uploadedAt).toLocaleTimeString()}</p>
              </div>
            </div>

            <div className="flex justify-end space-x-3">
              <button
                onClick={onNavigateToQueue}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs rounded-lg transition flex items-center space-x-1"
              >
                <span>View In Processing Queue</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Camera Modal ───────────────────────────────────────────────────── */}
      {showCamera && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 backdrop-blur-sm p-4"
          onClick={(e) => { if (e.target === e.currentTarget) closeCamera(); }}
        >
          <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">

            {/* Modal Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Camera className="w-4 h-4 text-blue-400" />
                <span className="text-sm font-bold text-slate-100">Camera Capture</span>
              </div>
              <button
                onClick={closeCamera}
                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4">

              {/* Camera permission error */}
              {cameraError && (
                <div className="flex items-start gap-2 p-3 bg-red-500/15 border border-red-500/30 rounded-lg text-xs text-red-300">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-red-400" />
                  <span>{cameraError}</span>
                </div>
              )}

              {/* Hidden canvas for frame capture */}
              <canvas ref={canvasRef} className="hidden" />

              {/* Live preview or captured image */}
              {!capturedDataUrl ? (
                <div className="relative bg-slate-950 rounded-xl overflow-hidden aspect-video flex items-center justify-center border border-slate-800">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                  />
                  {!cameraError && (
                    <div className="absolute bottom-2 left-0 right-0 flex justify-center">
                      <span className="text-[10px] text-slate-400 bg-slate-950/70 px-2 py-0.5 rounded-full">
                        Live preview
                      </span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="relative bg-slate-950 rounded-xl overflow-hidden aspect-video border border-slate-700">
                  <img
                    src={capturedDataUrl}
                    alt="Captured photo"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-2 right-2">
                    <span className="text-[10px] font-bold text-emerald-400 bg-slate-950/80 px-2 py-0.5 rounded-full border border-emerald-500/30">
                      Preview
                    </span>
                  </div>
                </div>
              )}

              {/* Action buttons */}
              <div className="flex items-center justify-center gap-3 flex-wrap">
                {!capturedDataUrl ? (
                  // Before capture
                  <>
                    <button
                      onClick={capturePhoto}
                      disabled={!!cameraError}
                      className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:text-slate-500 disabled:cursor-not-allowed text-white rounded-lg font-semibold text-sm transition cursor-pointer"
                    >
                      <Camera className="w-4 h-4" />
                      Capture Photo
                    </button>
                    <button
                      onClick={closeCamera}
                      className="flex items-center gap-2 px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg font-semibold text-sm transition cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                      Cancel
                    </button>
                  </>
                ) : (
                  // After capture
                  <>
                    <button
                      onClick={useCapturedPhoto}
                      className="flex items-center gap-2 px-5 py-2.5 bg-green-600 hover:bg-green-500 text-white rounded-lg font-semibold text-sm transition cursor-pointer"
                    >
                      <ImagePlus className="w-4 h-4" />
                      Use Photo
                    </button>
                    <button
                      onClick={retakePhoto}
                      className="flex items-center gap-2 px-5 py-2.5 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg font-semibold text-sm transition cursor-pointer"
                    >
                      <RotateCcw className="w-4 h-4" />
                      Retake
                    </button>
                    <button
                      onClick={closeCamera}
                      className="flex items-center gap-2 px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-400 rounded-lg font-semibold text-sm transition cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                      Cancel
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
