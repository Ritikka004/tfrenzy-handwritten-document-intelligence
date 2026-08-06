import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, AlertTriangle, CheckCircle2, Save, UserCheck, Eye, 
  HelpCircle, RefreshCw, ZoomIn, ZoomOut, Check, ArrowRight
} from 'lucide-react';
import { Document, ExtractedField, HumanCorrection } from '../types/index.ts';

interface VerificationViewProps {
  documents: Document[];
  onSaveCorrection: (documentId: string, corrections: Array<{ fieldKey: string; correctedText: string; notes?: string }>) => Promise<void>;
}

export const VerificationView: React.FC<VerificationViewProps> = ({
  documents,
  onSaveCorrection
}) => {
  const pendingDocs = documents.filter(d => d.status === 'verification_required' || d.status === 'uploaded');
  const [selectedDocId, setSelectedDocId] = useState<string>(pendingDocs[0]?.id || documents[0]?.id || '');
  const [fields, setFields] = useState<ExtractedField[]>([]);
  const [editedValues, setEditedValues] = useState<Record<string, string>>({});
  const [activeFieldKey, setActiveFieldKey] = useState<string>('');
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);

  useEffect(() => {
    if (selectedDocId) {
      fetch(`/api/documents/${selectedDocId}`)
        .then(res => res.json())
        .then(json => {
          if (json.success && json.data) {
            setFields(json.data.extractedFields || []);
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
  }, [selectedDocId]);

  const currentDoc = documents.find(d => d.id === selectedDocId);

  const handleFieldChange = (fieldKey: string, value: string) => {
    setEditedValues(prev => ({ ...prev, [fieldKey]: value }));
  };

  const handleCompleteVerification = async () => {
    setIsSaving(true);
    setSaveSuccess(false);

    const correctionsList = fields.map(f => ({
      fieldKey: f.fieldKey,
      correctedText: editedValues[f.fieldKey] || f.ocrValue,
      notes: editedValues[f.fieldKey] !== f.ocrValue ? 'Manual human correction applied.' : undefined
    }));

    try {
      await onSaveCorrection(selectedDocId, correctionsList);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  if (!currentDoc) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-12 text-center text-slate-400">
        <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
        <h2 className="text-lg font-bold text-slate-200">All Documents Verified!</h2>
        <p className="text-xs text-slate-400 mt-1">No pending documents requiring human verification in queue.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header & Selector */}
      <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-amber-400" />
            <span>Human-in-the-Loop Verification Workspace</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Review OCR outputs side-by-side with document image crops. Edits log audit-safe human corrections for model retraining.
          </p>
        </div>

        {/* Document Switcher */}
        <div className="flex items-center space-x-2">
          <label className="text-xs text-slate-400 font-semibold">Select Queue Item:</label>
          <select
            value={selectedDocId}
            onChange={(e) => setSelectedDocId(e.target.value)}
            className="bg-slate-950 text-slate-200 border border-slate-700 rounded-lg text-xs p-2 font-semibold focus:outline-none focus:border-blue-500"
          >
            {documents.map(d => (
              <option key={d.id} value={d.id}>
                {d.fileName} ({d.status.replace(/_/g, ' ')})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Split Screen Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Simulated Document Canvas & Bounding Box Overlays */}
        <div className="lg:col-span-6 bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <span className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                <Eye className="w-4 h-4 text-blue-400" />
                <span>Document Image & Field Bounding Boxes</span>
              </span>
              <span className="text-[11px] text-slate-400 font-mono">DPI: 300 | 2450x1800 px</span>
            </div>

            {/* Simulated Form Container with Interactive Field Boxes */}
            <div className="relative mt-4 bg-slate-950 border border-slate-800 rounded-lg p-6 min-h-[420px] flex flex-col justify-between select-none shadow-inner overflow-hidden">
              <div className="text-center border-b border-slate-800 pb-3 mb-4">
                <h3 className="text-sm font-extrabold text-slate-300 uppercase tracking-widest">
                  TFrenzy Gate Entrance Visitor Register
                </h3>
                <p className="text-[10px] text-slate-500 font-mono">FORM CODE: TF-VIS-2026-v1.0</p>
              </div>

              {/* Bounding Box Visual Grids */}
              <div className="grid grid-cols-2 gap-4 my-2">
                {fields.map((fld) => {
                  const isActive = activeFieldKey === fld.fieldKey;
                  const isLowConf = fld.confidenceLevel === 'low';
                  const isMedConf = fld.confidenceLevel === 'medium';

                  return (
                    <div
                      key={fld.id}
                      onClick={() => setActiveFieldKey(fld.fieldKey)}
                      className={`relative p-3 rounded-lg border cursor-pointer transition-all ${
                        isActive
                          ? 'border-blue-500 bg-blue-950/40 ring-2 ring-blue-500/50'
                          : isLowConf
                          ? 'border-rose-500/60 bg-rose-950/20 hover:border-rose-400'
                          : isMedConf
                          ? 'border-amber-500/60 bg-amber-950/20 hover:border-amber-400'
                          : 'border-slate-800 bg-slate-900/60 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1">
                        <span className="font-bold text-slate-300">{fld.label}</span>
                        <span className={`px-1.5 py-0.2 rounded font-mono font-bold text-[9px] ${
                          isLowConf ? 'bg-rose-500/20 text-rose-400' : isMedConf ? 'bg-amber-500/20 text-amber-400' : 'bg-emerald-500/20 text-emerald-400'
                        }`}>
                          {(fld.confidence * 100).toFixed(0)}%
                        </span>
                      </div>

                      {/* Simulated Handwriting Representation */}
                      <p className="text-sm font-serif italic text-amber-200/90 tracking-wide font-medium bg-slate-950/80 px-2 py-1 rounded border border-slate-800">
                        {editedValues[fld.fieldKey] || fld.ocrValue}
                      </p>
                    </div>
                  );
                })}
              </div>

              <div className="pt-3 border-t border-slate-800 flex justify-between items-center text-[10px] text-slate-500">
                <span>Click bounding region to highlight field on right</span>
                <span className="text-blue-400 font-semibold">Active: {activeFieldKey || 'None'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Verification & Editing Form */}
        <div className="lg:col-span-6 bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col justify-between space-y-4">
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <span className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                Extracted Fields Validation Form
              </span>
              <span className="text-xs text-slate-400">
                Original OCR predictions preserved for audit
              </span>
            </div>

            {/* Field Editing List */}
            <div className="space-y-3.5 max-h-[480px] overflow-y-auto pr-1">
              {fields.map((fld) => {
                const isActive = activeFieldKey === fld.fieldKey;
                const isEdited = editedValues[fld.fieldKey] !== fld.ocrValue;
                const isLow = fld.confidenceLevel === 'low';
                const isMed = fld.confidenceLevel === 'medium';

                return (
                  <div
                    key={fld.id}
                    onClick={() => setActiveFieldKey(fld.fieldKey)}
                    className={`p-3.5 rounded-xl border transition-all ${
                      isActive
                        ? 'border-blue-500 bg-slate-950 shadow-md ring-1 ring-blue-500/40'
                        : 'border-slate-800 bg-slate-950/60 hover:bg-slate-950'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-bold text-slate-200 flex items-center gap-2">
                        <span>{fld.label}</span>
                        {fld.isValid ? (
                          <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.2 rounded font-semibold">Valid Type</span>
                        ) : (
                          <span className="text-[10px] text-rose-400 bg-rose-500/10 px-1.5 py-0.2 rounded font-semibold">Type Rule Failed</span>
                        )}
                      </label>

                      <div className="flex items-center space-x-2">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                          isLow ? 'bg-rose-500/20 text-rose-400' : isMed ? 'bg-amber-500/20 text-amber-400' : 'bg-emerald-500/20 text-emerald-400'
                        }`}>
                          {fld.confidenceLevel} ({(fld.confidence * 100).toFixed(0)}%)
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
          </div>

          {/* Submit Action Bar */}
          <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
            {saveSuccess ? (
              <div className="text-emerald-400 font-bold text-xs flex items-center gap-1.5">
                <Check className="w-4 h-4" />
                <span>Verification & Corrections Saved into Database!</span>
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
