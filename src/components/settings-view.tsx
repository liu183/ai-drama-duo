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
import { aiConfigApi, agentConfigApi } from '@/lib/api';
import { toast } from 'sonner';

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
  { value: 'text', label: '文本' },
  { value: 'image', label: '图片' },
  { value: 'video', label: '视频' },
  { value: 'audio', label: '音频' },
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
};

// ==================== Component ====================
export default function SettingsView() {
  const [aiConfigs, setAiConfigs] = useState<AiConfig[]>([]);
  const [agentConfigs, setAgentConfigs] = useState<AgentConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [showApiKey, setShowApiKey] = useState<Record<string, boolean>>({});

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
  });
  const [savingAi, setSavingAi] = useState(false);
  const [deleteAiId, setDeleteAiId] = useState<string | null>(null);

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

  // ==================== AI Config Handlers ====================
  const openAiCreate = () => {
    setEditingAiConfig(null);
    setAiForm({ name: '', serviceType: 'text', provider: '', apiKey: '', baseUrl: '', model: '' });
    setAiDialog(true);
  };

  const openAiEdit = (config: AiConfig) => {
    setEditingAiConfig(config);
    setAiForm({
      name: config.name,
      serviceType: config.serviceType,
      provider: config.provider,
      apiKey: config.apiKey,
      baseUrl: config.baseUrl,
      model: config.model,
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Settings className="h-6 w-6" />
          系统设置
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          配置 AI 服务和 Agent 参数，优化短剧生成质量
        </p>
      </div>

      <Tabs defaultValue="ai-services" className="space-y-4">
        <TabsList>
          <TabsTrigger value="ai-services" className="gap-1.5">
            <Cpu className="h-4 w-4" />
            AI服务配置
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
                <CardTitle className="text-base">AI 服务配置</CardTitle>
                <CardDescription>配置文本、图片、视频、音频等 AI 服务的接入参数</CardDescription>
              </div>
              <Button size="sm" onClick={openAiCreate} className="gap-1.5">
                <Plus className="h-3.5 w-3.5" />
                添加服务
              </Button>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-3">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : aiConfigs.length === 0 ? (
                <div className="text-center py-12">
                  <Server className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-muted-foreground">暂无 AI 服务配置</p>
                  <p className="text-sm text-muted-foreground/60 mt-1">
                    添加 AI 服务以启用短剧生成功能
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>名称</TableHead>
                        <TableHead>类型</TableHead>
                        <TableHead className="hidden md:table-cell">提供商</TableHead>
                        <TableHead className="hidden md:table-cell">模型</TableHead>
                        <TableHead>状态</TableHead>
                        <TableHead>操作</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {aiConfigs.map((config) => (
                        <TableRow key={config.id}>
                          <TableCell className="font-medium">{config.name}</TableCell>
                          <TableCell>
                            <Badge className={`text-xs ${SERVICE_TYPE_COLORS[config.serviceType] || ''}`}>
                              {SERVICE_TYPES.find(s => s.value === config.serviceType)?.label || config.serviceType}
                            </Badge>
                          </TableCell>
                          <TableCell className="hidden md:table-cell text-muted-foreground">
                            {config.provider || '-'}
                          </TableCell>
                          <TableCell className="hidden md:table-cell text-muted-foreground font-mono text-xs">
                            {config.model || '-'}
                          </TableCell>
                          <TableCell>
                            <Badge variant={config.isActive ? 'default' : 'secondary'} className="text-xs">
                              {config.isActive ? '已启用' : '未启用'}
                            </Badge>
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
        if (!open) setEditingAiConfig(null);
      }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingAiConfig ? '编辑 AI 服务' : '添加 AI 服务'}</DialogTitle>
            <DialogDescription>
              {editingAiConfig ? '修改 AI 服务配置' : '添加新的 AI 服务接入配置'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>名称 *</Label>
                <Input
                  value={aiForm.name}
                  onChange={(e) => setAiForm({ ...aiForm, name: e.target.value })}
                  placeholder="如：通义千问-文本"
                />
              </div>
              <div className="space-y-2">
                <Label>服务类型</Label>
                <Select
                  value={aiForm.serviceType}
                  onValueChange={(v) => setAiForm({ ...aiForm, serviceType: v })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {SERVICE_TYPES.map((s) => (
                      <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>提供商</Label>
              <Input
                value={aiForm.provider}
                onChange={(e) => setAiForm({ ...aiForm, provider: e.target.value })}
                placeholder="如：dashscope、openai"
              />
            </div>
            <div className="space-y-2">
              <Label>API Key</Label>
              <div className="relative">
                <Input
                  type={showApiKey['ai'] ? 'text' : 'password'}
                  value={aiForm.apiKey}
                  onChange={(e) => setAiForm({ ...aiForm, apiKey: e.target.value })}
                  placeholder="输入 API Key"
                  className="pr-10"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full w-9"
                  onClick={() => setShowApiKey({ ...showApiKey, ai: !showApiKey['ai'] })}
                >
                  {showApiKey['ai'] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Base URL</Label>
              <Input
                value={aiForm.baseUrl}
                onChange={(e) => setAiForm({ ...aiForm, baseUrl: e.target.value })}
                placeholder="https://api.example.com/v1"
              />
            </div>
            <div className="space-y-2">
              <Label>模型</Label>
              <Input
                value={aiForm.model}
                onChange={(e) => setAiForm({ ...aiForm, model: e.target.value })}
                placeholder="如：qwen-max、gpt-4o"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAiDialog(false)}>取消</Button>
            <Button onClick={handleSaveAi} disabled={savingAi} className="gap-1.5">
              {savingAi ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              保存
            </Button>
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
                  placeholder="默认模型"
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
              确定要删除该 AI 服务配置吗？此操作无法撤销。
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
