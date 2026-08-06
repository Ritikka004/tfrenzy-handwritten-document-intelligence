import React, { useState } from 'react';
import { Sliders, Plus, Save, Layers, CheckCircle2, Trash2 } from 'lucide-react';
import { DocumentTemplate, TemplateField, FieldType } from '../types/index.ts';

interface TemplateConfigViewProps {
  templates: DocumentTemplate[];
  onSaveTemplate: (template: Partial<DocumentTemplate>) => void;
}

export const TemplateConfigView: React.FC<TemplateConfigViewProps> = ({ templates, onSaveTemplate }) => {
  const [selectedTemplate, setSelectedTemplate] = useState<DocumentTemplate>(templates[0]);
  const [fields, setFields] = useState<TemplateField[]>(templates[0]?.fields || []);

  const handleAddField = () => {
    const newField: TemplateField = {
      id: `fld-custom-${Date.now()}`,
      templateId: selectedTemplate.id,
      fieldKey: `new_field_${fields.length + 1}`,
      label: `New Field ${fields.length + 1}`,
      fieldType: 'text',
      isRequired: true,
      minConfidence: 0.85,
      boundingBox: { x: 10, y: 10 + fields.length * 10, width: 35, height: 8 }
    };
    setFields([...fields, newField]);
  };

  const handleRemoveField = (id: string) => {
    setFields(fields.filter(f => f.id !== id));
  };

  return (
    <div className="space-y-6">
      <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <Sliders className="w-6 h-6 text-indigo-400" />
            <span>Document Template & Field Boundary Configuration</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Define bounding boxes, field validation regex patterns, and confidence threshold gates per form type.
          </p>
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
            {templates.map(tpl => (
              <button
                key={tpl.id}
                onClick={() => { setSelectedTemplate(tpl); setFields(tpl.fields); }}
                className={`w-full p-3 rounded-lg border text-left text-xs transition-all ${
                  selectedTemplate.id === tpl.id
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
              Field Definitions for {selectedTemplate.name}
            </span>
            <span className="text-xs text-indigo-400 font-mono">Template ID: {selectedTemplate.id}</span>
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
                        updated[idx].fieldKey = e.target.value;
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
                        updated[idx].fieldType = e.target.value as FieldType;
                        setFields(updated);
                      }}
                      className="w-full bg-slate-900 border border-slate-700 text-slate-200 rounded p-1 text-[11px]"
                    >
                      <option value="name">Name (Alpha)</option>
                      <option value="phone">Phone (10 Digits)</option>
                      <option value="date">Date (ISO)</option>
                      <option value="employee_id">Employee ID</option>
                      <option value="vehicle_number">Vehicle Reg</option>
                      <option value="quantity">Quantity (Positive Int)</option>
                      <option value="checklist">Checklist (Boolean)</option>
                    </select>
                  </div>
                  <div>
                    <span className="text-slate-500">Min Confidence</span>
                    <input
                      type="number"
                      step="0.05"
                      min="0.5"
                      max="1.0"
                      value={fld.minConfidence}
                      onChange={(e) => {
                        const updated = [...fields];
                        updated[idx].minConfidence = parseFloat(e.target.value);
                        setFields(updated);
                      }}
                      className="w-full bg-slate-900 border border-slate-700 text-slate-200 rounded p-1 text-[11px]"
                    />
                  </div>
                  <div>
                    <span className="text-slate-500">BBox (x, y, w, h %)</span>
                    <div className="text-[10px] font-mono text-slate-400 p-1 bg-slate-900 rounded border border-slate-800">
                      {fld.boundingBox.x}%, {fld.boundingBox.y}%, {fld.boundingBox.width}%
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="pt-3 border-t border-slate-800 text-right">
            <button
              onClick={() => onSaveTemplate({ ...selectedTemplate, fields })}
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-lg transition flex items-center space-x-1.5 ml-auto shadow"
            >
              <Save className="w-4 h-4" />
              <span>Save Template Schema</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
