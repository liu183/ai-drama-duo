'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Settings,
  Bot,
  Cpu,
  Plus,
  Pencil,
  Trash2,
  Save,
  Loader2,
  Eye,
  EyeOff,
  Server,
  Zap,
  Plug,
  ChevronDown,
  ChevronRight,
  ArrowUpDown,
  CircleCheck,
  CircleX,
  Globe,
  Landmark,
  Package,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { aiConfigApi, agentConfigApi } from '@/lib/api';
import { toast } from 'sonner';
import {
  PROVIDER_PRESETS,
  getProvidersByType,
  getModelsByProviderAndType,
  getProvidersByCategory,
  getTotalProviderCount,
  getTotalModelCount,
  type ProviderPreset,
} from '@/lib/provider-presets';

// ==================== Types ====================
interface AiConfig {
  id: string;
  name: string;
  serviceType: string;
  provider: string;
  apiKey: string;
  baseUrl: string;
  model: string;
  isActive: boolean;
  priority: number;
}

interface AgentConfig {
  id: string;
  agentType: string;
  systemPrompt: string;
  model: string;
  temperature: number;
  maxTokens: number;
  maxSteps: number;
}

const SERVICE_TYPES = [
  { value: 'text', label: '文本生成', icon: '📝' },
  { value: 'image', label: '图片生成', icon: '🎨' },
  { value: 'video', label: '视频生成', icon: '🎬' },
  { value: 'audio', label: '语音合成', icon: '🎙️' },
];

const SERVICE_TYPE_COLORS: Record<string, string> = {
  text: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  image: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  video: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400',
  audio: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400',
};

const AGENT_TYPE_LABELS: Record<string, string> = {
  script_rewriter: '剧本改写',
  extractor: '角色提取',
  storyboard_breaker: '分镜拆解',
  voice_assigner: '配音分配',
  image_prompt_generator: '画面提示词',
  video_prompt_generator: '视频提示词',
};

// ==================== Component ====================
export default function SettingsView() {
  const [aiConfigs, setAiConfigs] = useState<AiConfig[]>([]);
  const [agentConfigs, setAgentConfigs] = useState<AgentConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [showApiKey, setShowApiKey] = useState<Record<string, boolean>>({});
  const [activeServiceType, setActiveServiceType] = useState<string>('text');

  // AI Config dialog
  const [aiDialog, setAiDialog] = useState(false);
  const [editingAiConfig, setEditingAiConfig] = useState<AiConfig | null>(null);
  const [aiForm, setAiForm] = useState({
    name: '',
    serviceType: 'text',
    provider: '',
    apiKey: '',
    baseUrl: '',
    model: '',
    isActive: true,
    priority: 10,
  });
  const [savingAi, setSavingAi] = useState(false);
  const [deleteAiId, setDeleteAiId] = useState<string | null>(null);

  // Test connection
  const [testing, setTesting] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<Record<string, { success: boolean; message: string }>>({});

  // Dynamic model fetching
  const [fetchingModels, setFetchingModels] = useState(false);
  const [fetchedModels, setFetchedModels] = useState<Array<{ id: string; label: string; description?: string }>>([]);
  const [modelSource, setModelSource] = useState<'preset' | 'api'>('preset');

  // Auto-fetch models when apiKey + baseUrl are ready
  const autoFetchTimerRef = React.useRef<NodeJS.Timeout | null>(null);
  const prevApiKeyRef = React.useRef('');
  const prevBaseUrlRef = React.useRef('');

  // Provider category filter in dialog
  const [providerCategoryFilter, setProviderCategoryFilter] = useState<'all' | 'domestic' | 'international'>('all');

  // Agent Config dialog
  const [agentDialog, setAgentDialog] = useState(false);
  const [editingAgentConfig, setEditingAgentConfig] = useState<AgentConfig | null>(null);
  const [agentForm, setAgentForm] = useState({
    agentType: 'script_rewriter',
    systemPrompt: '',
    model: '',
    temperature: 0.7,
    maxTokens: 4096,
    maxSteps: 20,
  });
  const [savingAgent, setSavingAgent] = useState(false);

  const loadConfigs = useCallback(async () => {
    setLoading(true);
    try {
      const [aiRes, agentRes] = await Promise.all([
        aiConfigApi.list(),
        agentConfigApi.list(),
      ]);
      setAiConfigs(Array.isArray(aiRes) ? aiRes : aiRes.data || aiRes.items || []);
      setAgentConfigs(Array.isArray(agentRes) ? agentRes : agentRes.data || agentRes.items || []);
    } catch {
      toast.error('加载配置失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadConfigs();
  }, [loadConfigs]);

  // ==================== Provider Preset Helpers ====================
  const availableProviders = getProvidersByType(aiForm.serviceType as 'text' | 'image' | 'video' | 'audio');

  // 按分类过滤供应商
  const filteredAvailableProviders = providerCategoryFilter === 'all'
    ? availableProviders
    : availableProviders.filter(p => p.category === providerCategoryFilter);

  const domesticProviders = filteredAvailableProviders.filter(p => p.category === 'domestic');
  const internationalProviders = filteredAvailableProviders.filter(p => p.category === 'international');
  const customProviders = filteredAvailableProviders.filter(p => p.category === 'custom');

  const presetModels = aiForm.provider
    ? getModelsByProviderAndType(aiForm.provider, aiForm.serviceType as 'text' | 'image' | 'video' | 'audio')
    : [];

  // 如果有动态拉取的模型，优先使用；否则使用预设模型
  const availableModels = fetchedModels.length > 0
    ? fetchedModels
    : presetModels.map(m => ({ id: m.modelId, label: m.label, description: m.description }));

  const handleProviderPresetChange = (providerId: string) => {
    const preset = PROVIDER_PRESETS.find(p => p.id === providerId);
    if (preset) {
      const modelsForType = preset.models.filter(m => m.type === aiForm.serviceType);
      const defaultModel = modelsForType[0]?.modelId || '';
      setAiForm({
        ...aiForm,
        provider: preset.id,
        baseUrl: preset.baseUrl,
        model: defaultModel,
        name: aiForm.name || `${preset.name} - ${SERVICE_TYPES.find(s => s.value === aiForm.serviceType)?.label}`,
      });
      // 重置动态模型
      setFetchedModels([]);
      setModelSource('preset');
      // 如果已有 apiKey，自动拉取
      if (aiForm.apiKey) {
        setTimeout(() => handleFetchModels(), 300);
      }
    } else {
      setAiForm({ ...aiForm, provider: providerId, baseUrl: '', model: '' });
      setFetchedModels([]);
      setModelSource('preset');
    }
  };

  // ==================== Dynamic Model Fetching ====================
  const handleFetchModels = async () => {
    if (!aiForm.baseUrl || !aiForm.apiKey) return;
    setFetchingModels(true);
    try {
      const res = await fetch('/api/ai-configs/fetch-models', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          baseUrl: aiForm.baseUrl,
          apiKey: aiForm.apiKey,
          provider: aiForm.provider,
          serviceType: aiForm.serviceType,
        }),
      });
      const data = await res.json();
      const result = data.data || data;
      if (result.success && result.models?.length > 0) {
        setFetchedModels(result.models);
        setModelSource(result.source || 'api');
        // 如果当前模型不在新列表中，自动选择第一个
        const modelIds = result.models.map((m: { id: string }) => m.id);
        if (!modelIds.includes(aiForm.model)) {
          setAiForm(prev => ({ ...prev, model: result.models[0].id }));
        }
      } else {
        // 拉取失败，保留预设模型
        setFetchedModels([]);
        setModelSource('preset');
      }
    } catch {
 setFetchedModels([]);
      setModelSource('preset');
    } finally {
      setFetchingModels(false);
    }
  };

  // 自动拉取：apiKey 或 baseUrl 变化时，延迟 1.5s 自动拉取
  useEffect(() => {
    if (autoFetchTimerRef.current) clearTimeout(autoFetchTimerRef.current);
    prevApiKeyRef.current = aiForm.apiKey;
    prevBaseUrlRef.current = aiForm.baseUrl;
    if (aiForm.apiKey && aiForm.baseUrl && aiForm.provider) {
      autoFetchTimerRef.current = setTimeout(() => handleFetchModels(), 1500);
    }
    return () => { if (autoFetchTimerRef.current) clearTimeout(autoFetchTimerRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aiForm.apiKey, aiForm.baseUrl, aiForm.provider, aiForm.serviceType]);

  // ==================== AI Config Handlers ====================
  const openAiCreate = () => {
    setEditingAiConfig(null);
    setTestResult({});
    setFetchedModels([]);
    setModelSource('preset');
    setProviderCategoryFilter('all');
    setAiForm({
      name: '',
      serviceType: activeServiceType,
      provider: '',
      apiKey: '',
      baseUrl: '',
      model: '',
      isActive: true,
      priority: 10,
    });
    setAiDialog(true);
  };

  const openAiEdit = (config: AiConfig) => {
    setEditingAiConfig(config);
    setTestResult({});
    setFetchedModels([]);
    setModelSource('preset');
    setProviderCategoryFilter('all');
    setAiForm({
      name: config.name,
      serviceType: config.serviceType,
      provider: config.provider,
      apiKey: config.apiKey,
      baseUrl: config.baseUrl,
      model: config.model,
      isActive: config.isActive,
      priority: config.priority,
    });
    setAiDialog(true);
  };

  const handleSaveAi = async () => {
    if (!aiForm.name.trim()) {
      toast.error('请输入配置名称');
      return;
    }
    setSavingAi(true);
    try {
      if (editingAiConfig) {
        await aiConfigApi.update(editingAiConfig.id, aiForm);
        toast.success('AI服务配置更新成功');
      } else {
        await aiConfigApi.create(aiForm);
        toast.success('AI服务配置创建成功');
      }
      setAiDialog(false);
      loadConfigs();
    } catch {
      toast.error('保存失败');
    } finally {
      setSavingAi(false);
    }
  };

  const handleDeleteAi = async () => {
    if (!deleteAiId) return;
    try {
      await aiConfigApi.delete(deleteAiId);
      toast.success('删除成功');
      setDeleteAiId(null);
      loadConfigs();
    } catch {
      toast.error('删除失败');
    }
  };

  const handleToggleActive = async (config: AiConfig) => {
    try {
      await aiConfigApi.update(config.id, { isActive: !config.isActive });
      toast.success(config.isActive ? '已禁用' : '已启用');
      loadConfigs();
    } catch {
      toast.error('切换状态失败');
    }
  };

  const handleTestConnection = async (configId?: string) => {
    if (configId) {
      // 测试已保存的配置
      setTesting(configId);
      setTestResult(prev => ({ ...prev, [configId]: { success: false, message: '测试中...' } }));
      try {
        const res = await fetch('/api/ai-configs/test', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: configId }),
        });
        const data = await res.json();
        const result = data.data || data;
        setTestResult(prev => ({ ...prev, [configId]: result }));
        if (result.success) {
          toast.success(result.message);
        } else {
          toast.error(result.message);
        }
      } catch {
        setTestResult(prev => ({ ...prev, [configId]: { success: false, message: '测试请求失败' } }));
        toast.error('测试请求失败');
      } finally {
        setTesting(null);
      }
    } else {
      // 测试对话框中的临时配置
      const tempId = 'temp-test';
      setTesting(tempId);
      setTestResult(prev => ({ ...prev, [tempId]: { success: false, message: '测试中...' } }));
      try {
        const res = await fetch('/api/ai-configs/test', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            serviceType: aiForm.serviceType,
            provider: aiForm.provider,
            apiKey: aiForm.apiKey,
            baseUrl: aiForm.baseUrl,
            model: aiForm.model,
          }),
        });
        const data = await res.json();
        const result = data.data || data;
        setTestResult(prev => ({ ...prev, [tempId]: result }));
        toast.success(result.success ? result.message : `测试失败: ${result.message}`);
      } catch {
        setTestResult(prev => ({ ...prev, [tempId]: { success: false, message: '测试请求失败' } }));
      } finally {
        setTesting(null);
      }
    }
  };

  // ==================== Agent Config Handlers ====================
  const openAgentCreate = () => {
    setEditingAgentConfig(null);
    setAgentForm({
      agentType: 'script_rewriter',
      systemPrompt: '',
      model: '',
      temperature: 0.7,
      maxTokens: 4096,
      maxSteps: 20,
    });
    setAgentDialog(true);
  };

  const openAgentEdit = (config: AgentConfig) => {
    setEditingAgentConfig(config);
    setAgentForm({
      agentType: config.agentType,
      systemPrompt: config.systemPrompt,
      model: config.model,
      temperature: config.temperature,
      maxTokens: config.maxTokens,
      maxSteps: config.maxSteps,
    });
    setAgentDialog(true);
  };

  const handleSaveAgent = async () => {
    if (!agentForm.agentType) {
      toast.error('请选择Agent类型');
      return;
    }
    setSavingAgent(true);
    try {
      if (editingAgentConfig) {
        await agentConfigApi.update(editingAgentConfig.id, agentForm);
        toast.success('Agent配置更新成功');
      } else {
        await agentConfigApi.create(agentForm);
        toast.success('Agent配置创建成功');
      }
      setAgentDialog(false);
      loadConfigs();
    } catch {
      toast.error('保存失败');
    } finally {
      setSavingAgent(false);
    }
  };

  // 按服务类型过滤配置
  const filteredConfigs = aiConfigs.filter(c => c.serviceType === activeServiceType);

  const getPresetName = (providerId: string) => {
    const preset = PROVIDER_PRESETS.find(p => p.id === providerId);
    return preset?.name || providerId;
  };

  const getPresetIcon = (providerId: string) => {
    const preset = PROVIDER_PRESETS.find(p => p.id === providerId);
    return preset?.icon || '⚙️';
  };

  const getPresetCategory = (providerId: string) => {
    const preset = PROVIDER_PRESETS.find(p => p.id === providerId);
    return preset?.category || 'custom';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Settings className="h-6 w-6" />
          系统设置
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          配置 AI 模型供应商和 Agent 参数，支持{' '}
          <span className="font-medium text-foreground">{getTotalProviderCount()}</span> 家供应商、
          <span className="font-medium text-foreground">{getTotalModelCount()}</span>+ 模型，
          覆盖文本、图片、视频、语音合成四大服务类型
        </p>
      </div>

      <Tabs defaultValue="ai-services" className="space-y-4">
        <TabsList>
          <TabsTrigger value="ai-services" className="gap-1.5">
            <Cpu className="h-4 w-4" />
            模型供应商
          </TabsTrigger>
          <TabsTrigger value="agent-config" className="gap-1.5">
            <Bot className="h-4 w-4" />
            Agent配置
          </TabsTrigger>
        </TabsList>

        {/* ========== AI Services Tab ========== */}
        <TabsContent value="ai-services">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base">模型供应商配置</CardTitle>
                <CardDescription>
                  添加并管理 AI 服务接入，系统将按优先级自动选择供应商（支持 fallback 链）
                </CardDescription>
              </div>
              <Button size="sm" onClick={openAiCreate} className="gap-1.5">
                <Plus className="h-3.5 w-3.5" />
                添加供应商
              </Button>
            </CardHeader>
            <CardContent>
              {/* 服务类型过滤标签 */}
              <div className="flex flex-wrap gap-2 mb-4">
                {SERVICE_TYPES.map((st) => (
                  <button
                    key={st.value}
                    onClick={() => setActiveServiceType(st.value)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                      activeServiceType === st.value
                        ? 'bg-primary text-primary-foreground shadow-sm'
                        : 'bg-muted text-muted-foreground hover:bg-muted/80'
                    }`}
                  >
                    <span>{st.icon}</span>
                    {st.label}
                    <Badge variant="secondary" className="ml-1 text-xs px-1.5">
                      {aiConfigs.filter(c => c.serviceType === st.value && c.isActive).length}
                    </Badge>
                  </button>
                ))}
              </div>

              {loading ? (
                <div className="space-y-3">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : filteredConfigs.length === 0 ? (
                <div className="text-center py-12">
                  <Server className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-muted-foreground">
                    暂无 {SERVICE_TYPES.find(s => s.value === activeServiceType)?.label} 供应商
                  </p>
                  <p className="text-sm text-muted-foreground/60 mt-1">
                    点击「添加供应商」快速配置 {SERVICE_TYPES.find(s => s.value === activeServiceType)?.icon}
                    {SERVICE_TYPES.find(s => s.value === activeServiceType)?.label} 服务
                  </p>
                  {/* 供应商推荐 - 按分类展示 */}
                  <div className="mt-6 max-w-lg mx-auto space-y-3">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">推荐供应商</p>
                    {[
                      { cat: 'domestic' as const, label: '国内', icon: <Landmark className="h-3.5 w-3.5" /> },
                      { cat: 'international' as const, label: '国际', icon: <Globe className="h-3.5 w-3.5" /> },
                    ].map(({ cat, label, icon }) => {
                      const providers = getProvidersByCategory(cat).filter(
                        p => p.supportedTypes.includes(activeServiceType as 'text' | 'image' | 'video' | 'audio')
                      );
                      if (providers.length === 0) return null;
                      return (
                        <div key={cat} className="text-left">
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1.5">
                            {icon}
                            <span>{label}</span>
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {providers.slice(0, 8).map((p) => (
                              <Badge
                                key={p.id}
                                variant="outline"
                                className="text-xs py-1 px-2 cursor-pointer hover:bg-accent transition-colors"
                                onClick={() => {
                                  setActiveServiceType(activeServiceType);
                                  openAiCreate();
                                  // Will auto-fill when user selects preset in dialog
                                }}
                              >
                                {p.icon} {p.name}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[40px]">状态</TableHead>
                        <TableHead>名称</TableHead>
                        <TableHead>供应商</TableHead>
                        <TableHead className="hidden md:table-cell">模型</TableHead>
                        <TableHead className="w-[80px]">优先级</TableHead>
                        <TableHead className="w-[80px]">测试</TableHead>
                        <TableHead>操作</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredConfigs.map((config) => (
                        <TableRow key={config.id} className={!config.isActive ? 'opacity-50' : ''}>
                          <TableCell>
                            <Switch
                              checked={config.isActive}
                              onCheckedChange={() => handleToggleActive(config)}
                              className="data-[state=checked]:bg-green-500"
                            />
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1.5">
                              {config.isActive && (
                                <span className="h-2 w-2 rounded-full bg-green-500 shrink-0" />
                              )}
                              <span className="font-medium">{config.name}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1.5">
                              <span>{getPresetIcon(config.provider)}</span>
                              <span className="text-sm text-muted-foreground">
                                {getPresetName(config.provider)}
                              </span>
                              {getPresetCategory(config.provider) === 'domestic' && (
                                <Badge variant="secondary" className="text-[10px] px-1 py-0">国内</Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="hidden md:table-cell">
                            <code className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono">
                              {config.model || '-'}
                            </code>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs">
                              <ArrowUpDown className="h-3 w-3 mr-1" />
                              {config.priority}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {testResult[config.id] ? (
                              <div className="flex items-center gap-1 text-xs">
                                {testResult[config.id].success ? (
                                  <CircleCheck className="h-4 w-4 text-green-500" />
                                ) : (
                                  <CircleX className="h-4 w-4 text-red-500" />
                                )}
                              </div>
                            ) : null}
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => handleTestConnection(config.id)}
                              disabled={testing === config.id}
                            >
                              {testing === config.id ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <Plug className="h-3.5 w-3.5" />
                              )}
                            </Button>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => openAiEdit(config)}
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive hover:text-destructive"
                                onClick={() => setDeleteAiId(config.id)}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}

              {/* 底部统计信息 */}
              {!loading && filteredConfigs.length > 0 && (
                <div className="mt-4 pt-4 border-t flex items-center justify-between text-xs text-muted-foreground">
                  <span>
                    已配置 {filteredConfigs.length} 个{SERVICE_TYPES.find(s => s.value === activeServiceType)?.label}供应商，
                    {filteredConfigs.filter(c => c.isActive).length} 个已启用
                  </span>
                  <span>
                    系统支持 {getProvidersByType(activeServiceType as 'text' | 'image' | 'video' | 'audio').length} 家供应商可选
                  </span>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ========== Agent Config Tab ========== */}
        <TabsContent value="agent-config">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base">Agent 配置</CardTitle>
                <CardDescription>配置各 AI Agent 的系统提示词、模型参数等</CardDescription>
              </div>
              <Button size="sm" onClick={openAgentCreate} className="gap-1.5">
                <Plus className="h-3.5 w-3.5" />
                添加Agent
              </Button>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-3">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : agentConfigs.length === 0 ? (
                <div className="text-center py-12">
                  <Bot className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-muted-foreground">暂无 Agent 配置</p>
                  <p className="text-sm text-muted-foreground/60 mt-1">
                    添加 Agent 配置以自定义 AI 处理行为
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {agentConfigs.map((config) => (
                    <motion.div
                      key={config.id}
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                    >
                      <Card className="hover:shadow-md transition-shadow">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <Bot className="h-4 w-4 text-primary" />
                                <h4 className="font-semibold text-sm">
                                  {AGENT_TYPE_LABELS[config.agentType] || config.agentType}
                                </h4>
                              </div>
                              {config.systemPrompt && (
                                <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                                  {config.systemPrompt.slice(0, 100)}...
                                </p>
                              )}
                              <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                                {config.model && <span>模型: {config.model}</span>}
                                <span>温度: {config.temperature}</span>
                                <span>最大Token: {config.maxTokens}</span>
                                <span>步数: {config.maxSteps}</span>
                              </div>
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              className="shrink-0 gap-1"
                              onClick={() => openAgentEdit(config)}
                            >
                              <Pencil className="h-3 w-3" />
                              编辑
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* AI Config Dialog */}
      <Dialog open={aiDialog} onOpenChange={(open) => {
        setAiDialog(open);
        if (!open) { setEditingAiConfig(null); setTestResult({}); setFetchedModels([]); }
      }}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingAiConfig ? '编辑 AI 供应商' : '添加 AI 供应商'}</DialogTitle>
            <DialogDescription>
              {editingAiConfig ? '修改 AI 服务配置' : '选择供应商预设或自定义配置'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {/* 服务类型 + 优先级 */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>服务类型</Label>
                <Select
                  value={aiForm.serviceType}
                  onValueChange={(v) => {
                    setAiForm({
                      ...aiForm,
                      serviceType: v,
                      provider: '',
                      baseUrl: '',
                      model: '',
                    });
                    setTestResult({});
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SERVICE_TYPES.map((s) => (
                      <SelectItem key={s.value} value={s.value}>
                        {s.icon} {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>优先级</Label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  value={aiForm.priority}
                  onChange={(e) => setAiForm({ ...aiForm, priority: parseInt(e.target.value) || 0 })}
                />
                <p className="text-xs text-muted-foreground">数值越高优先级越高</p>
              </div>
            </div>

            {/* 供应商预设选择 - 分组显示 */}
            <div className="space-y-2">
              <Label>供应商预设</Label>
              <Select
                value={aiForm.provider}
                onValueChange={handleProviderPresetChange}
              >
                <SelectTrigger>
                  <SelectValue placeholder="选择供应商..." />
                </SelectTrigger>
                <SelectContent>
                  {/* 国内供应商组 */}
                  {domesticProviders.length > 0 && (
                    <SelectGroup label="国内供应商">
                      {domesticProviders.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          <span className="flex items-center gap-2">
                            <span>{p.icon}</span>
                            <span>{p.name}</span>
                          </span>
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  )}
                  {/* 国际供应商组 */}
                  {internationalProviders.length > 0 && (
                    <SelectGroup label="国际供应商">
                      {internationalProviders.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          <span className="flex items-center gap-2">
                            <span>{p.icon}</span>
                            <span>{p.name}</span>
                          </span>
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  )}
                  {/* 自定义 */}
                  {customProviders.length > 0 && (
                    <SelectGroup label="自定义">
                      {customProviders.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          <span className="flex items-center gap-2">
                            <span>{p.icon}</span>
                            <span>{p.name}</span>
                          </span>
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  )}
                </SelectContent>
              </Select>
              {aiForm.provider && (
                <p className="text-xs text-muted-foreground">
                  {(() => {
                    const preset = PROVIDER_PRESETS.find(p => p.id === aiForm.provider);
                    return preset?.description || '';
                  })()}
                </p>
              )}
            </div>

            {/* 名称 */}
            <div className="space-y-2">
              <Label>配置名称 *</Label>
              <Input
                value={aiForm.name}
                onChange={(e) => setAiForm({ ...aiForm, name: e.target.value })}
                placeholder="如：通义千问-文本生成"
              />
            </div>

            {/* Base URL */}
            <div className="space-y-2">
              <Label>Base URL</Label>
              <Input
                value={aiForm.baseUrl}
                onChange={(e) => setAiForm({ ...aiForm, baseUrl: e.target.value })}
                placeholder="https://api.example.com/v1"
              />
            </div>

            {/* API Key */}
            <div className="space-y-2">
              <Label>API Key</Label>
              <div className="relative">
                <Input
                  type={showApiKey['dialog'] ? 'text' : 'password'}
                  value={aiForm.apiKey}
                  onChange={(e) => setAiForm({ ...aiForm, apiKey: e.target.value })}
                  placeholder="输入 API Key"
                  className="pr-10"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full w-9"
                  onClick={() => setShowApiKey({ ...showApiKey, dialog: !showApiKey['dialog'] })}
                >
                  {showApiKey['dialog'] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            {/* 模型选择 - 支持动态拉取 */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>模型</Label>
                <div className="flex items-center gap-2">
                  {fetchedModels.length > 0 && (
                    <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                      {modelSource === 'api' ? '已从API拉取' : '预设模型'}
                    </span>
                  )}
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-xs"
                    onClick={handleFetchModels}
                    disabled={fetchingModels || !aiForm.baseUrl || !aiForm.apiKey}
                  >
                    {fetchingModels ? (
                      <Loader2 className="h-3 w-3 animate-spin mr-1" />
                    ) : (
                      <Zap className="h-3 w-3 mr-1" />
                    )}
                    拉取模型
                  </Button>
                </div>
              </div>
              {availableModels.length > 0 ? (
                <Select
                  value={aiForm.model}
                  onValueChange={(v) => setAiForm({ ...aiForm, model: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="选择模型..." />
                  </SelectTrigger>
                  <SelectContent>
                    {availableModels.map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        <span className="flex flex-col">
                          <span>{m.label}</span>
                          {m.description && (
                            <span className="text-xs text-muted-foreground">{m.description}</span>
                          )}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : null}
              <Input
                value={aiForm.model}
                onChange={(e) => setAiForm({ ...aiForm, model: e.target.value })}
                placeholder={
                  availableModels.length > 0
                    ? '或手动输入模型名称'
                    : '输入模型名称，如 qwen-max、gpt-4o'
                }
                className={availableModels.length > 0 ? 'mt-1' : ''}
              />
              {fetchingModels && (
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  正在从供应商API拉取模型列表...
                </p>
              )}
            </div>

            {/* 连接测试结果 */}
            {testResult['temp-test'] && (
              <div className={`p-3 rounded-lg text-sm ${
                testResult['temp-test'].success
                  ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400'
                  : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400'
              }`}>
                <div className="flex items-center gap-2">
                  {testResult['temp-test'].success ? (
                    <CircleCheck className="h-4 w-4" />
                  ) : (
                    <CircleX className="h-4 w-4" />
                  )}
                  {testResult['temp-test'].message}
                </div>
              </div>
            )}
          </div>
          <DialogFooter className="flex justify-between">
            <Button
              variant="outline"
              onClick={() => handleTestConnection()}
              disabled={testing === 'temp-test' || !aiForm.baseUrl || !aiForm.apiKey}
              className="gap-1.5"
            >
              {testing === 'temp-test' ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plug className="h-4 w-4" />
              )}
              测试连接
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setAiDialog(false)}>取消</Button>
              <Button onClick={handleSaveAi} disabled={savingAi} className={`gap-1.5 ${testResult['temp-test']?.success ? 'bg-green-600 hover:bg-green-700' : ''}`}>
                {savingAi ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                {testResult['temp-test']?.success ? '测试通过，保存' : '保存'}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Agent Config Dialog */}
      <Dialog open={agentDialog} onOpenChange={(open) => {
        setAgentDialog(open);
        if (!open) setEditingAgentConfig(null);
      }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingAgentConfig ? '编辑 Agent 配置' : '添加 Agent 配置'}</DialogTitle>
            <DialogDescription>
              {editingAgentConfig ? '修改 Agent 处理参数' : '添加新的 Agent 配置'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Agent 类型</Label>
              <Select
                value={agentForm.agentType}
                onValueChange={(v) => setAgentForm({ ...agentForm, agentType: v })}
                disabled={!!editingAgentConfig}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(AGENT_TYPE_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>系统提示词</Label>
              <textarea
                className="flex min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-y"
                value={agentForm.systemPrompt}
                onChange={(e) => setAgentForm({ ...agentForm, systemPrompt: e.target.value })}
                placeholder="输入 Agent 的系统提示词..."
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>模型</Label>
                <Input
                  value={agentForm.model}
                  onChange={(e) => setAgentForm({ ...agentForm, model: e.target.value })}
                  placeholder="留空使用默认供应商"
                />
              </div>
              <div className="space-y-2">
                <Label>温度</Label>
                <Input
                  type="number"
                  step="0.1"
                  min="0"
                  max="2"
                  value={agentForm.temperature}
                  onChange={(e) => setAgentForm({ ...agentForm, temperature: parseFloat(e.target.value) || 0.7 })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>最大 Token</Label>
                <Input
                  type="number"
                  min="256"
                  max="128000"
                  value={agentForm.maxTokens}
                  onChange={(e) => setAgentForm({ ...agentForm, maxTokens: parseInt(e.target.value) || 4096 })}
                />
              </div>
              <div className="space-y-2">
                <Label>最大步数</Label>
                <Input
                  type="number"
                  min="1"
                  max="100"
                  value={agentForm.maxSteps}
                  onChange={(e) => setAgentForm({ ...agentForm, maxSteps: parseInt(e.target.value) || 20 })}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAgentDialog(false)}>取消</Button>
            <Button onClick={handleSaveAgent} disabled={savingAgent} className="gap-1.5">
              {savingAgent ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              保存
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete AI Config Confirmation */}
      <AlertDialog open={!!deleteAiId} onOpenChange={() => setDeleteAiId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>
              确定要删除该 AI 供应商配置吗？此操作无法撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteAi} className="bg-destructive text-white hover:bg-destructive/90">
              删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// SelectGroup helper component (inline)
function SelectGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
        {label}
      </div>
      {children}
    </div>
  );
}
