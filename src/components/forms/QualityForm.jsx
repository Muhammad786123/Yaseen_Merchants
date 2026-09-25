import React, { useState, useEffect } from 'react';
import Input from '../ui/Input.jsx';
import Textarea from '../ui/Textarea.jsx';
import Button from '../ui/Button.jsx';
import { isRequired } from '../../utils/validators.js';

export default function QualityForm({ initialData = null, onSubmit, onCancel }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (initialData) {
      setName(initialData.name || '');
      setDescription(initialData.description || '');
    }
  }, [initialData]);

  const handleSubmit = (e) => {
    e.preventDefault();
    const errs = {};
    if (!isRequired(name)) errs.name = 'Quality Grade Name is required';

    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }

    onSubmit({ name, description });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input
        label="Quality Grade Name"
        value={name}
        onChange={setName}
        placeholder="e.g. Cotton A"
        required
        error={errors.name}
      />
      <Textarea
        label="Description"
        value={description}
        onChange={setDescription}
        placeholder="Specification details..."
      />
      <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#E0DBD3]">
        <Button variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" variant="primary">
          {initialData ? 'Update Quality' : 'Save Quality'}
        </Button>
      </div>
    </form>
  );
}
