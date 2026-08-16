import React, { useState } from 'react';
import {
  Upload, CheckCircle2, RefreshCw, ArrowRight, AlertTriangle
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
  const [visitorName, setVisitorName] = useState("");
  const [mobileNumber, setMobileNumber] = useState("");
  const [visitDate, setVisitDate] = useState("");
  const [hostEmployeeId, setHostEmployeeId] = useState("");
  const [vehicleRegistrationNumber, setVehicleRegistrationNumber] = useState("");
  const [passIssueQuality, setPassIssueQuality] = useState("");

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

      if (visitorName) formData.append("visitorName", visitorName);
      if (mobileNumber) formData.append("mobileNumber", mobileNumber);
      if (visitDate) formData.append("visitDate", visitDate);
      if (hostEmployeeId) formData.append("hostEmployeeId", hostEmployeeId);
      if (vehicleRegistrationNumber) formData.append("vehicleRegistrationNumber", vehicleRegistrationNumber);
      if (passIssueQuality) formData.append("passIssueQuality", passIssueQuality);

      const res = await fetch("/api/documents/upload", {
        method: "POST",
        body: formData,
      });

      const json = await res.json();
      if (json.success && json.data?.document) {
        setUploadResult(json.data.document);
        onUploadSuccess(json.data.document);
        setSelectedFile(null);
        setVisitorName("");
        setMobileNumber("");
        setVisitDate("");
        setHostEmployeeId("");
        setVehicleRegistrationNumber("");
        setPassIssueQuality("");
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

        {/* Visitor Information */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          <input
            type="text"
            placeholder="Visitor Full Name"
            value={visitorName}
            onChange={(e) => setVisitorName(e.target.value)}
            className="bg-slate-950 border border-slate-700 rounded-lg p-3 text-slate-200"
          />

          <input
            type="text"
            placeholder="Mobile Number"
            value={mobileNumber}
            onChange={(e) => setMobileNumber(e.target.value)}
            className="bg-slate-950 border border-slate-700 rounded-lg p-3 text-slate-200"
          />

          <input
            type="date"
            value={visitDate}
            onChange={(e) => setVisitDate(e.target.value)}
            className="bg-slate-950 border border-slate-700 rounded-lg p-3 text-slate-200"
          />

          <input
            type="text"
            placeholder="Host Employee ID"
            value={hostEmployeeId}
            onChange={(e) => setHostEmployeeId(e.target.value)}
            className="bg-slate-950 border border-slate-700 rounded-lg p-3 text-slate-200"
          />

          <input
            type="text"
            placeholder="Vehicle Registration Number"
            value={vehicleRegistrationNumber}
            onChange={(e) => setVehicleRegistrationNumber(e.target.value)}
            className="bg-slate-950 border border-slate-700 rounded-lg p-3 text-slate-200"
          />

          <select
            value={passIssueQuality}
            onChange={(e) => setPassIssueQuality(e.target.value)}
            className="bg-slate-950 border border-slate-700 rounded-lg p-3 text-slate-200"
          >
            <option value="">Pass Issue Quality</option>
            <option value="Good">Good</option>
            <option value="Average">Average</option>
            <option value="Poor">Poor</option>
          </select>
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
    </div>
  );
};
