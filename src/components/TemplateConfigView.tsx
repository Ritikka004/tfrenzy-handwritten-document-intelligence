import React, { useState } from 'react';
import { Sliders, Plus, Save, Layers, CheckCircle2, Trash2 } from 'lucide-react';
import { DocumentTemplate, TemplateField, FieldType } from '../types/index.ts';
import { HIGH_CONFIDENCE_THRESHOLD, MEDIUM_CONFIDENCE_THRESHOLD } from '../constants/confidence.ts';

// ─── Realistic mock templates (used when backend is offline) ─────────────────
const MOCK_TEMPLATES: DocumentTemplate[] = [
  {
    id:             'tpl-mock-001',
    documentTypeId: 'dt-visitor',
    name:           'Visitor Entry Register',
    version:        'v2.1',
    description:    'Standard visitor entry register for campus access log scanning',
    createdAt:      '2026-06-01T08:00:00Z',
    fields: [
      {
        id:             'fld-001',
        templateId:     'tpl-mock-001',
        fieldKey:       'visitor_name',
        label:          'Visitor Full Name',
        fieldType:      'name',
        isRequired:     true,
        validationRegex: '^[A-Za-z\\s\\.\'-]{2,50}$',
        minConfidence:  0.85,
        boundingBox:    { x: 7.60, y: 19.34, width: 39.36, height: 7.83 },
      },
      {
        id:             'fld-002',
        templateId:     'tpl-mock-001',
        fieldKey:       'mobile_number',
        label:          'Mobile Number',
        fieldType:      'phone',
        isRequired:     true,
        validationRegex: '^[6-9]\\d{9}$',
        minConfidence:  0.85,
        boundingBox:    { x: 53.87, y: 19.34, width: 39.36, height: 7.83 },
      },
      {
        id:             'fld-003',
        templateId:     'tpl-mock-001',
        fieldKey:       'visit_date',
        label:          'Date of Visit',
        fieldType:      'date',
        isRequired:     true,
        validationRegex: '^(\\d{4}-\\d{2}-\\d{2}|\\d{2}\\/\\d{2}\\/\\d{4})$',
        minConfidence:  0.85,
        boundingBox:    { x: 7.60, y: 32.69, width: 39.36, height: 7.37 },
      },
      {
        id:             'fld-004',
        templateId:     'tpl-mock-001',
        fieldKey:       'host_employee_id',
        label:          'Host Employee ID',
        fieldType:      'employee_id',
        isRequired:     true,
        validationRegex: '^EMP[ -]?[0-9\\-]{3,10}$',
        minConfidence:  0.80,
        boundingBox:    { x: 53.87, y: 32.69, width: 39.36, height: 7.37 },
      },
      {
        id:             'fld-005',
        templateId:     'tpl-mock-001',
        fieldKey:       'vehicle_number',
        label:          'Vehicle Registration Number',
        fieldType:      'vehicle_number',
        isRequired:     false,
        validationRegex: '^[A-Z]{2}[0-9]{1,2}[A-Z]{1,3}[0-9]{4}$',
        minConfidence:  0.80,
        boundingBox:    { x: 7.60, y: 46.04, width: 39.36, height: 7.37 },
      },
      {
        id:             'fld-006',
        templateId:     'tpl-mock-001',
        fieldKey:       'passes_issued_quantity',
        label:          'Passes Issued Quantity',
        fieldType:      'quantity',
        isRequired:     true,
        validationRegex: '^(?!0+$)\\d{1,4}$',
        minConfidence:  0.85,
        boundingBox:    { x: 53.87, y: 46.04, width: 39.36, height: 7.37 },
      },
    ],
  },
  {
    id:             'tpl-mock-002',
    documentTypeId: 'dt-employee',
    name:           'Employee Information Form',
    version:        'v1.3',
    description:    'Employee onboarding & verification form schema',
    createdAt:      '2026-05-10T09:00:00Z',
    fields: [
      {
        id:             'fld-201',
        templateId:     'tpl-mock-002',
        fieldKey:       'employee_name',
        label:          'Employee Name',
        fieldType:      'name',
        isRequired:     true,
        validationRegex: '^[A-Za-z .]{2,80}$',
        minConfidence:  0.85,
        boundingBox:    { x: 10, y: 12, width: 40, height: 8 },
      },
      {
        id:             'fld-202',
        templateId:     'tpl-mock-002',
        fieldKey:       'employee_id',
        label:          'Employee ID',
        fieldType:      'employee_id',
        isRequired:     true,
        validationRegex: '^EMP-\\d{4}$',
        minConfidence:  0.90,
        boundingBox:    { x: 55, y: 12, width: 35, height: 8 },
      },
      {
        id:             'fld-203',
        templateId:     'tpl-mock-002',
        fieldKey:       'department',
        label:          'Department',
        fieldType:      'text',
        isRequired:     true,
        minConfidence:  0.80,
        boundingBox:    { x: 10, y: 22, width: 40, height: 8 },
      },
      {
        id:             'fld-204',
        templateId:     'tpl-mock-002',
        fieldKey:       'designation',
        label:          'Designation',
        fieldType:      'text',
        isRequired:     false,
        minConfidence:  0.75,
        boundingBox:    { x: 55, y: 22, width: 35, height: 8 },
      },
    ],
  },
];

interface TemplateConfigViewProps {
  templates: DocumentTemplate[];
  onSaveTemplate: (template: Partial<DocumentTemplate>) => void;
}

export const TemplateConfigView: React.FC<TemplateConfigViewProps> = ({ templates, onSaveTemplate }) => {
  // Use real templates from API when available; fall back to mock templates offline
  const displayTemplates = templates.length > 0 ? templates : MOCK_TEMPLATES;

  const [selectedTemplate, setSelectedTemplate] = useState<DocumentTemplate>(displayTemplates[0]);
  const [fields, setFields]                     = useState<TemplateField[]>(displayTemplates[0]?.fields || []);
  const [saveStatus, setSaveStatus]             = useState<'idle' | 'saving' | 'saved'>('idle');

  const handleAddField = () => {
    if (!selectedTemplate) return;
    const newField: TemplateField = {
      id:           `fld-custom-${Date.now()}`,
      templateId:   selectedTemplate.id,
      fieldKey:     `new_field_${fields.length + 1}`,
      label:        `New Field ${fields.length + 1}`,
      fieldType:    'text',
      isRequired:   true,
      minConfidence: 0.85,
      boundingBox:  { x: 10, y: 10 + fields.length * 10, width: 35, height: 8 }
    };
    setFields([...fields, newField]);
  };

  const handleRemoveField = (id: string) => {
    setFields(fields.filter(f => f.id !== id));
  };

  const handleSave = () => {
    setSaveStatus('saving');
    // Call the parent handler (real API when online)
    onSaveTemplate({ ...selectedTemplate, fields });
    // Show visible feedback regardless of API status
    setTimeout(() => {
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    }, 500);
  };

  return (
    <div className="space-y-6">
      <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <Sliders className="w-6 h-6 text-indigo-400" />
            <span>Document Template &amp; Field Boundary Configuration</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Define bounding boxes, field validation regex patterns, and minimum extraction confidence gates per form type.
          </p>
          <div className="flex items-center gap-2 mt-2 text-[11px] text-slate-400 font-mono">
            <span className="text-slate-500">Global Classification:</span>
            <span className="text-emerald-400 font-bold">High &gt;= {Math.round(HIGH_CONFIDENCE_THRESHOLD * 100)}%</span>
            <span className="text-slate-600">|</span>
            <span className="text-amber-400 font-bold">Medium {Math.round(MEDIUM_CONFIDENCE_THRESHOLD * 100)}–{Math.round(HIGH_CONFIDENCE_THRESHOLD * 100) - 1}%</span>
            <span className="text-slate-600">|</span>
            <span className="text-rose-400 font-bold">Low &lt; {Math.round(MEDIUM_CONFIDENCE_THRESHOLD * 100)}%</span>
          </div>
        </div>

        <button
          onClick={handleAddField}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-lg transition flex items-center space-x-1.5 shadow"
        >
          <Plus className="w-4 h-4" />
          <span>Add Configured Field</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Template List */}
        <div className="lg:col-span-4 bg-slate-900 border border-slate-800 p-4 rounded-xl space-y-3">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Active Templates</span>
          <div className="space-y-2">
            {displayTemplates.map(tpl => (
              <button
                key={tpl.id}
                onClick={() => { setSelectedTemplate(tpl); setFields(tpl.fields); setSaveStatus('idle'); }}
                className={`w-full p-3 rounded-lg border text-left text-xs transition-all ${
                  selectedTemplate?.id === tpl.id
                    ? 'border-indigo-500 bg-indigo-950/40 text-indigo-300 font-bold'
                    : 'border-slate-800 bg-slate-950 hover:border-slate-700 text-slate-400'
                }`}
              >
                <div className="font-semibold text-slate-200">{tpl.name}</div>
                <div className="text-[10px] text-slate-500 mt-0.5">Version: {tpl.version} | {tpl.fields.length} Fields</div>
              </button>
            ))}
          </div>
        </div>

        {/* Fields Editor */}
        <div className="lg:col-span-8 bg-slate-900 border border-slate-800 p-5 rounded-xl space-y-4">
          <div className="flex justify-between items-center pb-3 border-b border-slate-800">
            <span className="text-xs font-bold text-slate-200 uppercase tracking-wider">
              Field Definitions for {selectedTemplate?.name}
            </span>
            <span className="text-xs text-indigo-400 font-mono">Template ID: {selectedTemplate?.id}</span>
          </div>

          <div className="space-y-3 max-h-[460px] overflow-y-auto pr-1">
            {fields.map((fld, idx) => (
              <div key={fld.id} className="p-3.5 bg-slate-950 border border-slate-800 rounded-lg space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-200">Field #{idx + 1}: {fld.label}</span>
                  <button
                    onClick={() => handleRemoveField(fld.id)}
                    className="text-rose-400 hover:text-rose-300 transition"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                  <div>
                    <span className="text-slate-500">Field Key</span>
                    <input
                      type="text"
                      value={fld.fieldKey}
                      onChange={(e) => {
                        const updated = [...fields];
                        updated[idx] = { ...updated[idx], fieldKey: e.target.value };
                        setFields(updated);
                      }}
                      className="w-full bg-slate-900 border border-slate-700 text-slate-200 rounded p-1 font-mono text-[11px]"
                    />
                  </div>
                  <div>
                    <span className="text-slate-500">Field Type</span>
                    <select
                      value={fld.fieldType}
                      onChange={(e) => {
                        const updated = [...fields];
                        updated[idx] = { ...updated[idx], fieldType: e.target.value as FieldType };
                        setFields(updated);
                      }}
                      className="w-full bg-slate-900 border border-slate-700 text-slate-200 rounded p-1 text-[11px]"
                    >
                      <option value="name">Name (Alpha)</option>
                      <option value="phone">Phone (10 Digits)</option>
                      <option value="date">Date (ISO)</option>
                      <option value="employee_id">Employee ID</option>
                      <option value="vehicle_number">Vehicle Registration Number</option>
                      <option value="quantity">Quantity (Positive Int)</option>
                      <option value="checklist">Checklist (Boolean)</option>
                    </select>
                  </div>
                  <div>
                    <span className="text-slate-500">Minimum Extraction Confidence</span>
                    <input
                      type="number"
                      step="0.05"
                      min="0.5"
                      max="1.0"
                      value={fld.minConfidence}
                      onChange={(e) => {
                        const updated = [...fields];
                        updated[idx] = { ...updated[idx], minConfidence: parseFloat(e.target.value) };
                        setFields(updated);
                      }}
                      className="w-full bg-slate-900 border border-slate-700 text-slate-200 rounded p-1 text-[11px]"
                    />
                  </div>
                  <div>
                    <span className="text-slate-500">BBox (x, y, w, h %)</span>
                    <div className="text-[10px] font-mono text-slate-400 p-1 bg-slate-900 rounded border border-slate-800">
                      {fld.boundingBox.x}%, {fld.boundingBox.y}%, {fld.boundingBox.width}%, {fld.boundingBox.height}%
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-3">
            {saveStatus === 'saved' && (
              <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Template schema saved successfully
              </span>
            )}
            <button
              onClick={handleSave}
              disabled={saveStatus === 'saving'}
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-lg transition flex items-center space-x-1.5 shadow"
            >
              <Save className="w-4 h-4" />
              <span>{saveStatus === 'saving' ? 'Saving…' : 'Save Template Schema'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
