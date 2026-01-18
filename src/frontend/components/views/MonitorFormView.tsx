import { useMutation, useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api, queryClient } from '../../lib/api';
import type { MonitorFormData } from '../../lib/schemas';
import type { Monitor } from '../../types';
import { MonitorForm } from '../config/MonitorForm';

export function MonitorFormView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEditMode = !!id;
  const [isSaved, setIsSaved] = useState(false);

  // 1. Fetch data if editing
  const { data: monitor, isLoading } = useQuery({
    queryKey: ['monitor', id],
    queryFn: () => api.fetchMonitor(id!),
    enabled: isEditMode,
    retry: 1,
  });

  // 2. Mutations
  const createMutation = useMutation({
    mutationFn: api.createMonitor,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['monitors'] });
      navigate('/config');
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: { id: string; payload: Partial<Monitor> }) =>
      api.updateMonitor(data.id, data.payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['monitors'] });
      queryClient.invalidateQueries({ queryKey: ['monitor', id] });
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 3000);
    },
  });

  const handleSubmit = (data: MonitorFormData) => {
    setIsSaved(false);
    const payload = { ...data, enabled: data.enabled ? 1 : 0 };

    if (isEditMode && id) {
      updateMutation.mutate({ id, payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  if (isEditMode && isLoading) {
    return (
      <div className="panel animate-pulse text-gold-dim font-mono text-center p-8">
        :: ACCESSING ::
      </div>
    );
  }

  if (isEditMode && !monitor) {
    return (
      <div className="panel text-retro-red font-mono text-center p-8">
        :: ERROR: MONITOR NOT FOUND ::
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Navigation Header */}
      <div className="flex justify-between items-center">
        <div className="text-gold-dim font-mono text-xs uppercase">
          {isEditMode
            ? `Editing: ${monitor?.name}`
            : 'New Monitor Configuration'}
        </div>
        <div className="flex gap-4 items-center">
          {isSaved && (
            <span className="text-retro-green font-mono text-sm animate-pulse">
              :: CONFIG SAVED ::
            </span>
          )}
          {isEditMode && (
            <Link
              to={`/monitors/${id}`}
              className="text-xs uppercase hover:text-gold-primary text-gold-dim transition-colors font-mono"
            >
              &gt; View Monitor Details
            </Link>
          )}
        </div>
      </div>

      <MonitorForm
        defaultValues={monitor}
        onSubmit={handleSubmit}
        onCancel={() => navigate('/config')}
        isSubmitting={createMutation.isPending || updateMutation.isPending}
      />
    </div>
  );
}
