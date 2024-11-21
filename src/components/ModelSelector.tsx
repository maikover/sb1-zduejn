import React from 'react';
import { ModelType } from '../services/gemini';

interface ModelSelectorProps {
  currentModel: ModelType;
  onModelChange: (model: ModelType) => void;
}

export const ModelSelector: React.FC<ModelSelectorProps> = ({ currentModel, onModelChange }) => {
  return (
    <select
      value={currentModel}
      onChange={(e) => onModelChange(e.target.value as ModelType)}
      className="bg-primary border border-border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 text-primary"
    >
      <option value="gemini-1.5-pro">Gemini 1.5 Pro</option>
      <option value="gemini-1.5-flash">Gemini 1.5 Flash</option>
    </select>
  );
};