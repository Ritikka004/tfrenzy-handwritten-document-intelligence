import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, AlertTriangle, CheckCircle2, Save, UserCheck, Eye, 
  HelpCircle, RefreshCw, ZoomIn, ZoomOut, Check, ArrowRight
} from 'lucide-react';
import { Document, ExtractedField, HumanCorrection } from '../types/index.ts';
import { getConfidenceLevel } from '../constants/confidence.ts';

interface VerificationViewProps {
  documents: Document[];
  initialDocId?: string | null;
  onSaveCorrection: (documentId: string, corrections: Array<{ fieldKey: string; correctedText: string; notes?: string }>) => Promise<void>;
}

export const VerificationView: React.FC<VerificationViewProps> = ({
  documents,
  initialDocId,
  onSaveCorrection
}) => {
  const pendingDocs = React.useMemo(() => {
    return documents.filter(d => d.status === 'verification_required' || d.status === 'uploaded');
  }, [documents]);

  const [selectedDocId, setSelectedDocId] = useState<string>(
    (initialDocId && pendingDocs.some(d => d.id === initialDocId))
      ? initialDocId
      : pendingDocs[0]?.id || ''
  );
  const [fields, setFields] = useState<ExtractedField[]>([]);
  const [editedValues, setEditedValues] = useState<Record<string, string>>({});
  const [activeFieldKey, setActiveFieldKey] = useState<string>('');
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  const activeDocId = (selectedDocId && pendingDocs.some(d => d.id === selectedDocId))
    ? selectedDocId
    : (initialDocId && pendingDocs.some(d => d.id === initialDocId))
    ? initialDocId
    : pendingDocs[0]?.id || '';

  // When a new document is uploaded or selection changes, auto-select it in the verification view
  useEffect(() => {
    if (initialDocId && pendingDocs.some(d => d.id === initialDocId)) {
      setSelectedDocId(initialDocId);
    } else if (!selectedDocId || !pendingDocs.some(d => d.id === selectedDocId)) {
      if (pendingDocs.length > 0) {
        setSelectedDocId(pendingDocs[0].id);
      }
    }
  }, [initialDocId, pendingDocs, selectedDocId]);

  useEffect(() => {
    if (activeDocId) {
      fetch(`/api/documents/${activeDocId}`)
        .then(res => res.json())
        .then(json => {
          if (json.success && json.data) {
            setFields(json.data.extractedFields || []);
            setImageUrl(json.data.document?.imageUrl || null);
            const initialMap: Record<string, string> = {};
            (json.data.extractedFields || []).forEach((f: ExtractedField) => {
              initialMap[f.fieldKey] = f.finalValue || f.ocrValue;
            });
            setEditedValues(initialMap);
            if (json.data.extractedFields && json.data.extractedFields.length > 0) {
              setActiveFieldKey(json.data.extractedFields[0].fieldKey);
            }
          }
        })
        .catch(console.error);
    }
  }, [activeDocId]);

  const currentDoc = pendingDocs.find(d => d.id === activeDocId) || pendingDocs[0];

  const handleFieldChange = (fieldKey: string, value: string) => {
    setEditedValues(prev => ({ ...prev, [fieldKey]: value }));
  };

  const handleCompleteVerification = async () => {
    if (!activeDocId) return;
    setIsSaving(true);
    setSaveSuccess(false);
    setSaveError(null);

    // Submit only genuine OCR changes. Accepting an OCR value still completes
    // verification, but it must not create a human-correction audit event.
    const correctionsList = fields
      .filter(f => (editedValues[f.fieldKey] || f.ocrValue) !== f.ocrValue)
      .map(f => ({
        fieldKey: f.fieldKey,
        correctedText: editedValues[f.fieldKey] || f.ocrValue,
        notes: 'Manual human correction applied.'
      }));

    try {
      await onSaveCorrection(activeDocId, correctionsList);
      // Reflect corrections in-local UI immediately (backend preserves original OCR)
      setFields(prev => prev.map(f => ({
        ...f,
        finalValue: editedValues[f.fieldKey] || f.ocrValue,
        isCorrected: (editedValues[f.fieldKey] || f.ocrValue) !== f.ocrValue
      })));
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Verification save failed.');
    } finally {
      setIsSaving(false);
    }
  };

  if (pendingDocs.length === 0 || !currentDoc) {
    return (
      <div className="flex-1 min-h-0 flex items-center justify-center p-6">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 sm:p-10 max-w-md w-full text-center text-slate-400 shadow-2xl">
          <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-7 h-7 text-emerald-400" />
          </div>
          <h2 className="text-lg font-bold text-slate-100">All Documents Verified!</h2>
          <p className="text-xs text-slate-400 mt-2 leading-relaxed">
            No pending documents requiring human verification in the current queue. New documents will appear here automatically when uploaded.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 min-h-0 flex flex-col space-y-4">
      {/* Header & Selector */}
      <div className="bg-slate-900 border border-slate-800 p-4 sm:p-5 rounded-xl shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0">
        <div>
          <h1 className="text-lg sm:text-xl font-bold text-slate-100 flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 sm:w-6 sm:h-6 text-amber-400" />
            <span>Human-in-the-Loop Verification Workspace</span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Review OCR outputs side-by-side with document image crops. Edits log audit-safe human corrections for model retraining.
          </p>
        </div>

        {/* Document Switcher */}
        <div className="flex items-center space-x-2 shrink-0">
          <label className="text-xs text-slate-400 font-semibold">Select Queue Item ({pendingDocs.length} pending):</label>
          <select
            id="verification-doc-select"
            value={activeDocId}
            onChange={(e) => setSelectedDocId(e.target.value)}
            className="bg-slate-950 text-slate-200 border border-slate-700 rounded-lg text-xs p-2 font-semibold focus:outline-none focus:border-blue-500"
          >
            {pendingDocs.map(d => (
              <option key={d.id} value={d.id}>
                {d.fileName} ({d.status.replace(/_/g, ' ')})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Split Screen Workspace */}
      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Left Column: Simulated Document Canvas & Bounding Box Overlays */}
        <div className="lg:col-span-6 bg-slate-900 border border-slate-800 rounded-xl p-4 sm:p-5 flex flex-col overflow-y-auto space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800 shrink-0">
            <span className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
              <Eye className="w-4 h-4 text-blue-400" />
              <span>Document Image &amp; Field Bounding Boxes</span>
            </span>
            <span className="text-[11px] text-slate-400 font-mono">DPI: 300 | 2450x1800 px</span>
          </div>

          {imageUrl && (
            <div className="relative overflow-hidden rounded-lg border border-slate-800 bg-slate-950 shrink-0">
              <img src={imageUrl} alt="Uploaded document" className="block w-full h-auto" />
              {fields.map(field => {
                const status = field.verificationStatus || 'review';
                const color = status === 'accepted' ? 'border-emerald-400' : status === 'review' ? 'border-amber-400' : 'border-rose-400';
                return <button key={field.id} type="button" aria-label={`Select ${field.label}`} onClick={() => setActiveFieldKey(field.fieldKey)}
                  className={`absolute border-2 ${color} rounded-sm`} style={{ left: `${field.regionBox.x}%`, top: `${field.regionBox.y}%`, width: `${field.regionBox.width}%`, height: `${field.regionBox.height}%` }} />;
              })}
            </div>
          )}

          {/* Field card summary and synchronized bounding-box selection */}
          <div className="relative bg-slate-950 border border-slate-800 rounded-lg p-3.5 flex flex-col justify-between select-none shadow-inner">
            <div className="text-center border-b border-slate-800 pb-2 mb-2">
              <h3 className="text-xs sm:text-sm font-extrabold text-slate-300 uppercase tracking-widest">
                TFrenzy Gate Entrance Visitor Register
              </h3>
              <p className="text-[10px] text-slate-500 font-mono">FORM CODE: TF-VIS-2026-v1.0</p>
            </div>

            {/* Bounding Box Visual Grids */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 my-1">
              {fields.map((fld) => {
                const isActive = activeFieldKey === fld.fieldKey;
                const confLevel = fld.confidenceLevel || getConfidenceLevel(fld.confidence);
                const fieldStatus = fld.verificationStatus || (!fld.isValid ? 'manual_correction' : confLevel === 'low' ? 'manual_correction' : confLevel === 'medium' ? 'review' : 'accepted');
                const needsManual = fieldStatus === 'manual_correction';
                const needsReview = fieldStatus === 'review';

                return (
                  <div
                    key={fld.id}
                    onClick={() => setActiveFieldKey(fld.fieldKey)}
                    className={`relative p-2 rounded-lg border cursor-pointer transition-all ${
                      isActive
                        ? 'border-blue-500 bg-blue-950/40 ring-2 ring-blue-500/50'
                        : needsManual
                        ? 'border-rose-500/70 bg-rose-950/20 hover:border-rose-400'
                        : needsReview
                        ? 'border-amber-500/60 bg-amber-950/20 hover:border-amber-400'
                        : 'border-slate-800 bg-slate-900/60 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1">
                      <span className="font-bold text-slate-300 truncate pr-1">{fld.label}</span>
                      <div className="flex items-center gap-1 shrink-0">
                        {needsManual && (
                          <span className="text-[9px] bg-rose-500/10 text-rose-400 px-1 py-0.2 rounded font-semibold">Manual</span>
                        )}
                        {needsReview && <span className="text-[9px] bg-amber-500/10 text-amber-400 px-1 py-0.2 rounded font-semibold">Review</span>}

                        <span className={`px-1 py-0.2 rounded font-mono font-bold text-[9px] ${
                          needsManual ? 'bg-rose-500/20 text-rose-400' : needsReview ? 'bg-amber-500/20 text-amber-400' : 'bg-emerald-500/20 text-emerald-400'
                        }`}>
                          {(fld.confidence * 100).toFixed(0)}%
                        </span>
                      </div>
                    </div>

                    {/* Simulated Handwriting Representation */}
                    <p className="text-xs sm:text-sm font-serif italic text-amber-200/90 tracking-wide font-medium bg-slate-950/80 px-2 py-1 rounded border border-slate-800 truncate">
                      {editedValues[fld.fieldKey] || fld.ocrValue}
                    </p>
                  </div>
                );
              })}
            </div>

            <div className="pt-2 mt-1.5 border-t border-slate-800 flex justify-between items-center text-[10px] text-slate-500">
              <span>Click card to focus edit field</span>
              <span className="text-blue-400 font-semibold truncate ml-2">Active: {activeFieldKey || 'None'}</span>
            </div>
          </div>
        </div>

        {/* Right Column: Verification & Editing Form */}
        <div className="lg:col-span-6 bg-slate-900 border border-slate-800 rounded-xl p-4 sm:p-5 flex flex-col justify-between overflow-hidden space-y-3">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800 shrink-0">
            <span className="text-xs font-bold text-slate-200 uppercase tracking-wider">
              Extracted Fields Validation Form
            </span>
            <span className="text-xs text-slate-400">
              Original OCR predictions preserved for audit
            </span>
          </div>

          {/* Field Editing List - Contained Internal Scroll */}
          <div className="flex-1 min-h-0 overflow-y-auto pr-1 space-y-3">
            {fields.map((fld) => {
              const isActive = activeFieldKey === fld.fieldKey;
              const isEdited = editedValues[fld.fieldKey] !== fld.ocrValue;
              const confLevel = fld.confidenceLevel || getConfidenceLevel(fld.confidence);
              const fieldStatus = fld.verificationStatus || (!fld.isValid ? 'manual_correction' : confLevel === 'low' ? 'manual_correction' : confLevel === 'medium' ? 'review' : 'accepted');
              const needsManual = fieldStatus === 'manual_correction';
              const needsReview = fieldStatus === 'review';

              return (
                <div
                  key={fld.id}
                  onClick={() => setActiveFieldKey(fld.fieldKey)}
                  className={`p-3 rounded-xl border transition-all ${
                    isActive
                      ? 'border-blue-500 bg-slate-950 shadow-md ring-1 ring-blue-500/40'
                      : needsManual
                      ? 'border-rose-500/60 bg-rose-950/10'
                      : 'border-slate-800 bg-slate-950/60 hover:bg-slate-950'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold text-slate-200 flex items-center gap-2">
                      <span>{fld.label}</span>
                      {needsManual ? (
                        <span className="text-[10px] text-rose-400 bg-rose-500/10 px-1.5 py-0.2 rounded font-semibold">Requires Manual Correction</span>
                      ) : needsReview ? (
                        <span className="text-[10px] text-amber-400 bg-amber-500/10 px-1.5 py-0.2 rounded font-semibold">Review Recommended</span>
                      ) : fld.isValid ? (
                        <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.2 rounded font-semibold">Auto Accepted</span>
                      ) : (
                        <span className="text-[10px] text-rose-400 bg-rose-500/10 px-1.5 py-0.2 rounded font-semibold">Type Rule Failed</span>
                      )}
                    </label>

                    <div className="flex items-center space-x-2">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                        needsManual ? 'bg-rose-500/20 text-rose-400' : needsReview ? 'bg-amber-500/20 text-amber-400' : 'bg-emerald-500/20 text-emerald-400'
                      }`}>
                        {confLevel} ({(fld.confidence * 100).toFixed(0)}%)
                      </span>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <input
                        type="text"
                        value={editedValues[fld.fieldKey] || ''}
                        onChange={(e) => handleFieldChange(fld.fieldKey, e.target.value)}
                        className={`w-full bg-slate-900 border text-slate-100 rounded-lg px-3 py-1.5 text-xs font-mono font-semibold focus:outline-none ${
                          isEdited
                            ? 'border-amber-500 ring-1 ring-amber-500'
                            : needsManual
                            ? 'border-rose-500 ring-1 ring-rose-500/30'
                            : 'border-slate-700 focus:border-blue-500'
                        }`}
                      />
                    </div>

                    {/* Original Preserved OCR Output */}
                    <div className="flex items-center justify-between text-[10px] text-slate-500 pt-0.5">
                      <span>Raw OCR: <strong className="text-slate-400 font-mono">{fld.ocrValue}</strong></span>
                      {isEdited && <span className="text-amber-400 font-bold">Modified by Human</span>}
                    </div>

                    {fld.validationMessage && (
                      <p className="text-[10px] text-amber-400 flex items-center gap-1 pt-1">
                        <AlertTriangle className="w-3 h-3" />
                        <span>{fld.validationMessage}</span>
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Submit Action Bar */}
          <div className="pt-3 border-t border-slate-800 shrink-0 flex items-center justify-between">
            {saveSuccess ? (
              <div className="text-emerald-400 font-bold text-xs flex items-center gap-1.5">
                <Check className="w-4 h-4" />
                <span>Verification & Corrections Saved into Database!</span>
              </div>
            ) : saveError ? (
              <div role="alert" className="text-rose-400 font-semibold text-xs flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4" />
                <span>{saveError}</span>
              </div>
            ) : (
              <p className="text-[11px] text-slate-400">
                Submitting updates database record and logs audit correction entry.
              </p>
            )}

            <button
              id="btn-save-verification"
              onClick={handleCompleteVerification}
              disabled={isSaving}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-lg transition flex items-center space-x-2 shadow-lg disabled:opacity-50"
            >
              {isSaving ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Approve & Save Verified Data</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
