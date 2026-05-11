const API_BASE = '/api';

export async function fetchAPI(path: string, options?: RequestInit) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`API Error ${res.status}: ${text || res.statusText}`);
  }
  return res.json();
}

// ==================== Drama APIs ====================
export const dramaApi = {
  list: (params?: Record<string, string | number | undefined>) => {
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== '') searchParams.set(k, String(v));
      });
    }
    return fetchAPI(`/dramas?${searchParams.toString()}`);
  },
  create: (data: Record<string, unknown>) =>
    fetchAPI('/dramas', { method: 'POST', body: JSON.stringify(data) }),
  get: (id: string) => fetchAPI(`/dramas/${id}`),
  update: (id: string, data: Record<string, unknown>) =>
    fetchAPI(`/dramas/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: string) =>
    fetchAPI(`/dramas/${id}`, { method: 'DELETE' }),
};

// ==================== Episode APIs ====================
export const episodeApi = {
  get: (id: string) => fetchAPI(`/episodes/${id}`),
  update: (id: string, data: Record<string, unknown>) =>
    fetchAPI(`/episodes/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
};

// ==================== Character APIs ====================
export const characterApi = {
  list: (dramaId: string) => fetchAPI(`/characters?dramaId=${dramaId}`),
  create: (data: Record<string, unknown>) =>
    fetchAPI('/characters', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: Record<string, unknown>) =>
    fetchAPI(`/characters/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: string) =>
    fetchAPI(`/characters/${id}`, { method: 'DELETE' }),
  batchUpsert: (data: Record<string, unknown>[]) =>
    fetchAPI('/characters?action=batch', {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
};

// ==================== Scene APIs ====================
export const sceneApi = {
  list: (dramaId: string) => fetchAPI(`/scenes?dramaId=${dramaId}`),
  create: (data: Record<string, unknown>) =>
    fetchAPI('/scenes', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: Record<string, unknown>) =>
    fetchAPI(`/scenes/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: string) =>
    fetchAPI(`/scenes/${id}`, { method: 'DELETE' }),
  batchUpsert: (data: Record<string, unknown>[]) =>
    fetchAPI('/scenes?action=batch', {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
};

// ==================== Storyboard APIs ====================
export const storyboardApi = {
  list: (episodeId: string) => fetchAPI(`/storyboards?episodeId=${episodeId}`),
  create: (data: Record<string, unknown>) =>
    fetchAPI('/storyboards', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: Record<string, unknown>) =>
    fetchAPI(`/storyboards/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: string) =>
    fetchAPI(`/storyboards/${id}`, { method: 'DELETE' }),
  batchUpsert: (data: Record<string, unknown>[]) =>
    fetchAPI('/storyboards?action=batch', {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
};

// ==================== Agent API ====================
export interface AgentRequest {
  agentType: string;
  dramaId: string;
  episodeId?: string;
  message?: string;
}

export const agentApi = {
  run: (data: AgentRequest) =>
    fetchAPI('/agent', { method: 'POST', body: JSON.stringify(data) }),
};

// ==================== Merge API ====================
export const mergeApi = {
  getStatus: (episodeId: string) => fetchAPI(`/merge?episodeId=${episodeId}`),
  merge: (data: { episodeId: string; storyboardIds?: string[]; mergeConfig?: Record<string, unknown> }) =>
    fetchAPI('/merge', { method: 'POST', body: JSON.stringify(data) }),
};

// ==================== Export API ====================
export const exportApi = {
  // Returns JSON with content/filename/mimeType
  getExportData: (episodeId: string, format: string) =>
    fetchAPI('/export', { method: 'POST', body: JSON.stringify({ episodeId, format }) }),
  // Downloads file directly
  downloadUrl: (episodeId: string, format: string) =>
    `/api/export?episodeId=${episodeId}&format=${format}`,
};

// ==================== Config APIs ====================
export const agentConfigApi = {
  list: () => fetchAPI('/agent-configs'),
  create: (data: Record<string, unknown>) =>
    fetchAPI('/agent-configs', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: Record<string, unknown>) =>
    fetchAPI(`/agent-configs?id=${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  delete: (id: string) =>
    fetchAPI(`/agent-configs?id=${id}`, { method: 'DELETE' }),
};

export const aiConfigApi = {
  list: (serviceType?: string) =>
    fetchAPI(`/ai-configs${serviceType ? `?serviceType=${serviceType}` : ''}`),
  create: (data: Record<string, unknown>) =>
    fetchAPI('/ai-configs', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: Record<string, unknown>) =>
    fetchAPI(`/ai-configs/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  delete: (id: string) =>
    fetchAPI(`/ai-configs/${id}`, { method: 'DELETE' }),
};
