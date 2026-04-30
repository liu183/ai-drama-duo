'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  Pencil,
  Save,
  Users,
  MapPin,
  Film,
  Tv,
  Plus,
  Trash2,
  Clock,
  Loader2,
  Upload,
  X,
  ImagePlus,
  Sparkles,
  Dices,
  Check,
  RotateCcw,
  ImageIcon,
  Palette,
  Settings2,
  Eye,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  dramaApi,
  characterApi,
  sceneApi,
} from '@/lib/api';
import { toast } from 'sonner';
import type { DramaItem } from './drama-list';
import type {
  Episode,
  Character,
  CharacterAppearance,
  Scene,
  ScenePrompt,
  ImageStyleConfig,
  DramaDetail,
} from '@/types';
import {
  STATUS_MAP,
  ROLE_MAP,
  GENRES,
  STYLES,
  STATUS_OPTIONS,
  ASPECT_RATIOS,
  DEFAULT_STYLE_CONFIG,
} from '@/lib/constants';
import {
  copyToClipboard,
  fileToBase64,
  tryParseJSON,
  parseReferenceImages,
  generateSeedValue,
} from '@/lib/utils';

// ==================== Helper Functions ====================
function parseAppearanceJSON(raw: string): CharacterAppearance {
  return tryParseJSON<CharacterAppearance>(raw, { text: raw });
}

function serializeAppearance(appearance: CharacterAppearance): string {
  return JSON.stringify(appearance);
}

function parseScenePromptJSON(raw: string): ScenePrompt {
  return tryParseJSON<ScenePrompt>(raw, { text: raw });
}

function serializeScenePrompt(prompt: ScenePrompt): string {
  return JSON.stringify(prompt);
}

function parseDramaMetadata(raw: string | undefined): { imageStyle?: ImageStyleConfig } {
  return tryParseJSON(raw, {});
}

function generateCharacterPromptEn(a: CharacterAppearance): string {
  const parts: string[] = [];
  if (a.ageRange) parts.push(`${a.ageRange} year old`);
  if (a.gender) parts.push(`${a.gender === 'female' ? 'woman' : a.gender === 'male' ? 'man' : 'person'}`);
  if (a.hairStyle) parts.push(a.hairStyle);
  if (a.eyeColor) parts.push(`${a.eyeColor} eyes`);
  if (a.skinTone) parts.push(`${a.skinTone} skin`);
  if (a.bodyType) parts.push(`${a.bodyType} build`);
  if (a.clothing) parts.push(`wearing ${a.clothing}`);
  if (a.distinguishing) parts.push(a.distinguishing);
  return parts.join(', ');
}

function generateScenePromptEn(s: ScenePrompt): string {
  const parts: string[] = [];
  if (s.environmentType) parts.push(`${s.environmentType} scene`);
  if (s.architecturalStyle) parts.push(s.architecturalStyle);
  if (s.lighting) parts.push(s.lighting);
  if (s.weather) parts.push(s.weather);
  if (s.season) parts.push(`${s.season} atmosphere`);
  if (s.colorTone) parts.push(`${s.colorTone} color tones`);
  if (s.keyProps) parts.push(s.keyProps);
  return parts.join(', ');
}

// ==================== Image Upload Component ====================
function ImageUploader({
  value,
  onChange,
  label,
  className = '',
  helpText,
  accept = 'image/*',
}: {
  value: string;
  onChange: (val: string) => void;
  label?: string;
  className?: string;
  helpText?: string;
  accept?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  const handleFile = async (file: File) => {
    if (file.size > 5 * 1024 * 1024) {
      toast.error('文件大小不能超过 5MB');
      return;
    }
    const base64 = await fileToBase64(file);
    onChange(base64);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  return (
    <div className={`space-y-2 ${className}`}>
      {label && <label className="text-sm font-medium">{label}</label>}
      {value ? (
        <div className="relative group rounded-lg overflow-hidden border border-border">
          <img src={value} alt="Reference" className="w-full h-40 object-cover" />
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
            <Button
              size="sm"
              variant="secondary"
              onClick={() => inputRef.current?.click()}
              className="gap-1"
            >
              <Upload className="h-3.5 w-3.5" />
              替换
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={() => onChange('')}
              className="gap-1"
            >
              <X className="h-3.5 w-3.5" />
              移除
            </Button>
          </div>
        </div>
      ) : (
        <div
          className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
            dragOver
              ? 'border-primary bg-primary/5'
              : 'border-muted-foreground/25 hover:border-primary/50'
          }`}
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
        >
          <ImagePlus className="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
          <p className="text-sm text-muted-foreground">点击或拖拽上传</p>
          <p className="text-xs text-muted-foreground/60 mt-1">最大 5MB</p>
        </div>
      )}
      {helpText && <p className="text-xs text-muted-foreground">{helpText}</p>}
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
          e.target.value = '';
        }}
      />
    </div>
  );
}

// ==================== Main Component ====================
type DramaDetailProps = {
  dramaId: string;
  onBack: () => void;
  onEnterStudio: (dramaId: string, episodeId: string, episodeNumber: number) => void;
  refreshKey?: number;
};

export default function DramaDetailView({
  dramaId,
  onBack,
  onEnterStudio,
  refreshKey,
}: DramaDetailProps) {
  const [drama, setDrama] = useState<DramaDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState<Record<string, string | number>>({});
  const [deleteCharId, setDeleteCharId] = useState<string | null>(null);
  const [deleteSceneId, setDeleteSceneId] = useState<string | null>(null);
  const [charDialog, setCharDialog] = useState(false);
  const [sceneDialog, setSceneDialog] = useState(false);
  const [editingChar, setEditingChar] = useState<Character | null>(null);
  const [editingScene, setEditingScene] = useState<Scene | null>(null);

  // Character form with structured appearance
  const [charForm, setCharForm] = useState({
    name: '',
    role: 'supporting',
    description: '',
    appearance: {} as CharacterAppearance,
    personality: '',
    imageUrl: '',
    referenceImages: [] as string[],
    seedValue: '',
  });

  // Scene form with structured prompt
  const [sceneForm, setSceneForm] = useState({
    location: '',
    time: '',
    prompt: {} as ScenePrompt,
    imageUrl: '',
  });

  // Global style config
  const [styleConfig, setStyleConfig] = useState<ImageStyleConfig>(DEFAULT_STYLE_CONFIG);
  const [styleSaving, setStyleSaving] = useState(false);

  const loadDrama = useCallback(async () => {
    setLoading(true);
    try {
      const data = await dramaApi.get(dramaId);
      const dramaData = data.data || data;
      setDrama(dramaData);

      // Load style config from metadata
      const meta = parseDramaMetadata(dramaData.metadata);
      if (meta.imageStyle) {
        setStyleConfig({ ...DEFAULT_STYLE_CONFIG, ...meta.imageStyle });
      }
    } catch {
      toast.error('加载短剧详情失败');
    } finally {
      setLoading(false);
    }
  }, [dramaId]);

  useEffect(() => {
    loadDrama();
  }, [loadDrama, refreshKey]);

  const handleSaveInfo = async () => {
    setSaving(true);
    try {
      await dramaApi.update(dramaId, editForm);
      setEditing(false);
      loadDrama();
      toast.success('保存成功');
    } catch {
      toast.error('保存失败');
    } finally {
      setSaving(false);
    }
  };

  const startEditing = () => {
    if (!drama) return;
    setEditForm({
      title: drama.title,
      description: drama.description,
      genre: drama.genre,
      style: drama.style,
      status: drama.status,
      totalEpisodes: drama.totalEpisodes,
    });
    setEditing(true);
  };

  // ========== Style Config Handlers ==========
  const handleSaveStyleConfig = async () => {
    setStyleSaving(true);
    try {
      const currentMeta = parseDramaMetadata(drama?.metadata);
      const newMeta = JSON.stringify({
        ...currentMeta,
        imageStyle: styleConfig,
      });
      await dramaApi.update(dramaId, { metadata: newMeta });
      loadDrama();
      toast.success('画面风格配置已保存');
    } catch {
      toast.error('保存风格配置失败');
    } finally {
      setStyleSaving(false);
    }
  };

  const handleResetStyleConfig = () => {
    setStyleConfig(DEFAULT_STYLE_CONFIG);
  };

  // ========== Character Handlers ==========
  const handleCreateCharacter = async () => {
    if (!charForm.name.trim()) {
      toast.error('请输入角色名称');
      return;
    }
    try {
      const payload = {
        dramaId,
        name: charForm.name,
        role: charForm.role,
        description: charForm.description,
        appearance: serializeAppearance(charForm.appearance),
        personality: charForm.personality,
        imageUrl: charForm.imageUrl,
        referenceImages: JSON.stringify(charForm.referenceImages),
        seedValue: charForm.seedValue,
      };
      await characterApi.create(payload);
      toast.success('角色创建成功');
      setCharDialog(false);
      setEditingChar(null);
      loadDrama();
    } catch {
      toast.error('创建角色失败');
    }
  };

  const handleUpdateCharacter = async () => {
    if (!editingChar) return;
    try {
      const payload = {
        name: charForm.name,
        role: charForm.role,
        description: charForm.description,
        appearance: serializeAppearance(charForm.appearance),
        personality: charForm.personality,
        imageUrl: charForm.imageUrl,
        referenceImages: JSON.stringify(charForm.referenceImages),
        seedValue: charForm.seedValue,
      };
      await characterApi.update(editingChar.id, payload);
      toast.success('角色更新成功');
      setCharDialog(false);
      setEditingChar(null);
      loadDrama();
    } catch {
      toast.error('更新角色失败');
    }
  };

  const handleDeleteCharacter = async () => {
    if (!deleteCharId) return;
    try {
      await characterApi.delete(deleteCharId);
      toast.success('角色删除成功');
      setDeleteCharId(null);
      loadDrama();
    } catch {
      toast.error('删除角色失败');
    }
  };

  const openCharEdit = (char: Character) => {
    setEditingChar(char);
    const appearance = parseAppearanceJSON(char.appearance);
    const refImages = parseReferenceImages(char.referenceImages);
    setCharForm({
      name: char.name,
      role: char.role,
      description: char.description,
      appearance,
      personality: char.personality,
      imageUrl: char.imageUrl,
      referenceImages: refImages,
      seedValue: char.seedValue || '',
    });
    setCharDialog(true);
  };

  const openCharCreate = () => {
    setEditingChar(null);
    setCharForm({
      name: '',
      role: 'supporting',
      description: '',
      appearance: {},
      personality: '',
      imageUrl: '',
      referenceImages: [],
      seedValue: '',
    });
    setCharDialog(true);
  };

  const handleAddReferenceImage = async () => {
    if (charForm.referenceImages.length >= 3) {
      toast.error('最多上传 3 张附加参考图');
      return;
    }
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      if (file.size > 5 * 1024 * 1024) {
        toast.error('文件大小不能超过 5MB');
        return;
      }
      const base64 = await fileToBase64(file);
      setCharForm({ ...charForm, referenceImages: [...charForm.referenceImages, base64] });
    };
    input.click();
  };

  const handleRemoveReferenceImage = (index: number) => {
    const updated = charForm.referenceImages.filter((_, i) => i !== index);
    setCharForm({ ...charForm, referenceImages: updated });
  };

  // ========== Scene Handlers ==========
  const handleCreateScene = async () => {
    if (!sceneForm.location.trim()) {
      toast.error('请输入场景地点');
      return;
    }
    try {
      const payload = {
        dramaId,
        location: sceneForm.location,
        time: sceneForm.time,
        prompt: serializeScenePrompt(sceneForm.prompt),
        imageUrl: sceneForm.imageUrl,
      };
      await sceneApi.create(payload);
      toast.success('场景创建成功');
      setSceneDialog(false);
      setEditingScene(null);
      loadDrama();
    } catch {
      toast.error('创建场景失败');
    }
  };

  const handleUpdateScene = async () => {
    if (!editingScene) return;
    try {
      const payload = {
        location: sceneForm.location,
        time: sceneForm.time,
        prompt: serializeScenePrompt(sceneForm.prompt),
        imageUrl: sceneForm.imageUrl,
      };
      await sceneApi.update(editingScene.id, payload);
      toast.success('场景更新成功');
      setSceneDialog(false);
      setEditingScene(null);
      loadDrama();
    } catch {
      toast.error('更新场景失败');
    }
  };

  const handleDeleteScene = async () => {
    if (!deleteSceneId) return;
    try {
      await sceneApi.delete(deleteSceneId);
      toast.success('场景删除成功');
      setDeleteSceneId(null);
      loadDrama();
    } catch {
      toast.error('删除场景失败');
    }
  };

  const openSceneEdit = (scene: Scene) => {
    setEditingScene(scene);
    const prompt = parseScenePromptJSON(scene.prompt);
    setSceneForm({
      location: scene.location,
      time: scene.time,
      prompt,
      imageUrl: scene.imageUrl || '',
    });
    setSceneDialog(true);
  };

  const openSceneCreate = () => {
    setEditingScene(null);
    setSceneForm({
      location: '',
      time: '',
      prompt: {},
      imageUrl: '',
    });
    setSceneDialog(true);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!drama) {
    return (
      <div className="text-center py-20">
        <p className="text-muted-foreground">短剧不存在或已被删除</p>
        <Button variant="outline" onClick={onBack} className="mt-4">
          返回列表
        </Button>
      </div>
    );
  }

  return (
    <TooltipProvider delayDuration={300}>
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold truncate">{drama.title}</h1>
          <p className="text-sm text-muted-foreground truncate">
            {drama.description || '暂无描述'}
          </p>
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview" className="gap-1.5">
            <Film className="h-4 w-4 hidden sm:block" />
            概览
          </TabsTrigger>
          <TabsTrigger value="episodes" className="gap-1.5">
            <Tv className="h-4 w-4 hidden sm:block" />
            集数
          </TabsTrigger>
          <TabsTrigger value="characters" className="gap-1.5">
            <Users className="h-4 w-4 hidden sm:block" />
            角色
          </TabsTrigger>
          <TabsTrigger value="scenes" className="gap-1.5">
            <MapPin className="h-4 w-4 hidden sm:block" />
            场景
          </TabsTrigger>
        </TabsList>

        {/* ========== Overview Tab ========== */}
        <TabsContent value="overview">
          <div className="space-y-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>项目信息</CardTitle>
                {!editing ? (
                  <Button variant="outline" size="sm" onClick={startEditing} className="gap-1.5">
                    <Pencil className="h-3.5 w-3.5" />
                    编辑
                  </Button>
                ) : (
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => setEditing(false)}>
                      取消
                    </Button>
                    <Button size="sm" onClick={handleSaveInfo} disabled={saving} className="gap-1.5">
                      {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                      保存
                    </Button>
                  </div>
                )}
              </CardHeader>
              <CardContent>
                {editing ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">剧名</label>
                      <Input
                        value={editForm.title as string}
                        onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">类型</label>
                      <Select
                        value={editForm.genre as string}
                        onValueChange={(v) => setEditForm({ ...editForm, genre: v })}
                      >
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {GENRES.map((g) => (
                            <SelectItem key={g} value={g}>{g}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">风格</label>
                      <Select
                        value={editForm.style as string}
                        onValueChange={(v) => setEditForm({ ...editForm, style: v })}
                      >
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {STYLES.map((s) => (
                            <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">状态</label>
                      <Select
                        value={editForm.status as string}
                        onValueChange={(v) => setEditForm({ ...editForm, status: v })}
                      >
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {STATUS_OPTIONS.map((s) => (
                            <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <label className="text-sm font-medium">简介</label>
                      <Textarea
                        value={editForm.description as string}
                        onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                        className="min-h-[100px]"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">类型</p>
                        <p className="font-medium">{drama.genre || '未设置'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">风格</p>
                        <p className="font-medium">{STYLES.find(s => s.value === drama.style)?.label || drama.style}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">总集数</p>
                        <p className="font-medium">{drama.totalEpisodes} 集</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">状态</p>
                        <Badge className={STATUS_MAP[drama.status]?.color || ''}>
                          {STATUS_MAP[drama.status]?.label || drama.status}
                        </Badge>
                      </div>
                    </div>
                    <Separator />
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div className="p-3 rounded-lg bg-muted/50">
                        <p className="text-2xl font-bold text-primary">{drama.episodes?.length || drama._count?.episodes || 0}</p>
                        <p className="text-xs text-muted-foreground">集数</p>
                      </div>
                      <div className="p-3 rounded-lg bg-muted/50">
                        <p className="text-2xl font-bold text-primary">{drama.characters?.length || drama._count?.characters || 0}</p>
                        <p className="text-xs text-muted-foreground">角色</p>
                      </div>
                      <div className="p-3 rounded-lg bg-muted/50">
                        <p className="text-2xl font-bold text-primary">{drama.scenes?.length || drama._count?.scenes || 0}</p>
                        <p className="text-xs text-muted-foreground">场景</p>
                      </div>
                    </div>
                    <Separator />
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">创建时间</p>
                      <p className="text-sm">{new Date(drama.createdAt).toLocaleString('zh-CN')}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">更新时间</p>
                      <p className="text-sm">{new Date(drama.updatedAt).toLocaleString('zh-CN')}</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Global Style Config Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.1 }}
            >
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Palette className="h-5 w-5 text-primary" />
                    <CardTitle>画面风格配置</CardTitle>
                  </div>
                  <div className="flex gap-2">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="outline" size="sm" onClick={handleResetStyleConfig} className="gap-1.5">
                          <RotateCcw className="h-3.5 w-3.5" />
                          恢复默认
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>重置为默认风格配置</TooltipContent>
                    </Tooltip>
                    <Button size="sm" onClick={handleSaveStyleConfig} disabled={styleSaving} className="gap-1.5">
                      {styleSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                      保存配置
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">画面比例</label>
                      <Select
                        value={styleConfig.aspectRatio}
                        onValueChange={(v) => setStyleConfig({ ...styleConfig, aspectRatio: v })}
                      >
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {ASPECT_RATIOS.map((ar) => (
                            <SelectItem key={ar.value} value={ar.value}>{ar.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">质量关键词</label>
                      <Input
                        value={styleConfig.qualityKeywords}
                        onChange={(e) => setStyleConfig({ ...styleConfig, qualityKeywords: e.target.value })}
                        placeholder="8K UHD, masterpiece, best quality..."
                      />
                      <p className="text-xs text-muted-foreground">多个关键词用逗号分隔，将附加到每个画面提示词末尾</p>
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <label className="text-sm font-medium">风格前缀</label>
                      <Textarea
                        value={styleConfig.stylePromptPrefix}
                        onChange={(e) => setStyleConfig({ ...styleConfig, stylePromptPrefix: e.target.value })}
                        className="min-h-[60px]"
                        placeholder="cinematic, dramatic lighting, film grain..."
                      />
                      <p className="text-xs text-muted-foreground">每个画面提示词会以此前缀开头</p>
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <label className="text-sm font-medium">排除项（Negative Prompts）</label>
                      <Textarea
                        value={styleConfig.negativePrompts}
                        onChange={(e) => setStyleConfig({ ...styleConfig, negativePrompts: e.target.value })}
                        className="min-h-[60px]"
                        placeholder="blurry, low quality, watermark..."
                      />
                      <p className="text-xs text-muted-foreground">不希望出现在画面中的元素</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </TabsContent>

        {/* ========== Episodes Tab ========== */}
        <TabsContent value="episodes">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                共 {drama.episodes?.length || 0} 集
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {(drama.episodes || []).map((ep) => (
                <motion.div
                  key={ep.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <Card
                    className="cursor-pointer hover:shadow-md transition-all hover:-translate-y-0.5"
                    onClick={() => onEnterStudio(dramaId, ep.id, ep.episodeNumber)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-mono text-muted-foreground">
                          第 {ep.episodeNumber} 集
                        </span>
                        <Badge className={`text-xs ${STATUS_MAP[ep.status]?.color || ''}`}>
                          {STATUS_MAP[ep.status]?.label || ep.status}
                        </Badge>
                      </div>
                      <h3 className="font-medium truncate">
                        {ep.title || `第 ${ep.episodeNumber} 集`}
                      </h3>
                      <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {ep.duration > 0 ? `${ep.duration.toFixed(0)}秒` : '-'}
                        </span>
                      </div>
                      {ep.scriptContent && (
                        <p className="text-xs text-muted-foreground mt-2 line-clamp-2">
                          {ep.scriptContent.slice(0, 60)}...
                        </p>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>
        </TabsContent>

        {/* ========== Characters Tab ========== */}
        <TabsContent value="characters">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                共 {drama.characters?.length || 0} 个角色
              </p>
              <Button size="sm" onClick={openCharCreate} className="gap-1.5">
                <Plus className="h-3.5 w-3.5" />
                添加角色
              </Button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {(drama.characters || []).map((char) => {
                const appearance = parseAppearanceJSON(char.appearance);
                const refImages = parseReferenceImages(char.referenceImages);
                const hasSeed = !!char.seedValue;
                const hasRefs = !!char.imageUrl || refImages.length > 0;
                return (
                  <motion.div
                    key={char.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    <Card className="overflow-hidden hover:shadow-md transition-shadow">
                      <div className="h-32 bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center relative">
                        {char.imageUrl ? (
                          <img src={char.imageUrl} alt={char.name} className="w-full h-full object-cover" />
                        ) : (
                          <Users className="h-10 w-10 text-primary/20" />
                        )}
                        {/* Config indicators */}
                        <div className="absolute top-2 right-2 flex gap-1">
                          {hasSeed && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Badge className="bg-violet-100 text-violet-700 dark:bg-violet-900/50 dark:text-violet-300 text-xs gap-0.5">
                                  <Dices className="h-2.5 w-2.5" />
                                  种子
                                </Badge>
                              </TooltipTrigger>
                              <TooltipContent>已配置种子值，保证角色一致性</TooltipContent>
                            </Tooltip>
                          )}
                          {hasRefs && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Badge className="bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300 text-xs gap-0.5">
                                  <ImageIcon className="h-2.5 w-2.5" />
                                  参考图
                                </Badge>
                              </TooltipTrigger>
                              <TooltipContent>已配置参考图</TooltipContent>
                            </Tooltip>
                          )}
                        </div>
                      </div>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <h3 className="font-semibold">{char.name}</h3>
                          <Badge variant="outline" className="text-xs">
                            {ROLE_MAP[char.role] || char.role}
                          </Badge>
                        </div>
                        {appearance.text && (
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                            {appearance.text}
                          </p>
                        )}
                        {refImages.length > 0 && (
                          <div className="flex gap-1 mt-2">
                            {refImages.slice(0, 3).map((img, i) => (
                              <img
                                key={i}
                                src={img}
                                alt={`参考图${i + 1}`}
                                className="w-8 h-8 rounded object-cover border border-border"
                              />
                            ))}
                          </div>
                        )}
                        <div className="flex gap-1 mt-3">
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1 text-xs"
                            onClick={() => openCharEdit(char)}
                          >
                            编辑
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-xs text-destructive hover:text-destructive"
                            onClick={() => setDeleteCharId(char.id)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </TabsContent>

        {/* ========== Scenes Tab ========== */}
        <TabsContent value="scenes">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                共 {drama.scenes?.length || 0} 个场景
              </p>
              <Button size="sm" onClick={openSceneCreate} className="gap-1.5">
                <Plus className="h-3.5 w-3.5" />
                添加场景
              </Button>
            </div>
            <div className="space-y-3">
              {(drama.scenes || []).map((scene) => {
                const scenePrompt = parseScenePromptJSON(scene.prompt);
                const hasImage = !!scene.imageUrl;
                return (
                  <motion.div
                    key={scene.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    <Card className="hover:shadow-md transition-shadow">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <MapPin className="h-4 w-4 text-primary shrink-0" />
                              <h3 className="font-medium truncate">{scene.location || '未命名场景'}</h3>
                              {scene.time && (
                                <Badge variant="outline" className="text-xs shrink-0">
                                  {scene.time}
                                </Badge>
                              )}
                              <Badge className={`text-xs shrink-0 ${STATUS_MAP[scene.status]?.color || ''}`}>
                                {STATUS_MAP[scene.status]?.label || scene.status}
                              </Badge>
                              {hasImage && (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Badge className="bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300 text-xs gap-0.5">
                                      <ImageIcon className="h-2.5 w-2.5" />
                                      参考图
                                    </Badge>
                                  </TooltipTrigger>
                                  <TooltipContent>已配置参考图</TooltipContent>
                                </Tooltip>
                              )}
                            </div>
                            {scenePrompt.text && (
                              <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                                {scenePrompt.text}
                              </p>
                            )}
                            <div className="flex items-center gap-3 mt-2">
                              <p className="text-xs text-muted-foreground">
                                {scene.storyboardCount} 个分镜
                              </p>
                              {scene.imageUrl && (
                                <div className="flex items-center gap-2">
                                  <img
                                    src={scene.imageUrl}
                                    alt="场景参考"
                                    className="w-10 h-10 rounded object-cover border border-border"
                                  />
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-1 ml-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-primary shrink-0"
                              onClick={() => openSceneEdit(scene)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-destructive shrink-0"
                              onClick={() => setDeleteSceneId(scene.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* ==================== Character Dialog ==================== */}
      <Dialog open={charDialog} onOpenChange={(open) => {
        setCharDialog(open);
        if (!open) setEditingChar(null);
      }}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingChar ? '编辑角色' : '添加角色'}</DialogTitle>
            <DialogDescription>
              {editingChar ? '修改角色信息，配置核心资产以保证AI生成一致性' : '为新短剧添加角色，配置核心资产以保证AI生成一致性'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6">
            {/* Basic Info */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">角色名 *</label>
                <Input
                  value={charForm.name}
                  onChange={(e) => setCharForm({ ...charForm, name: e.target.value })}
                  placeholder="如：林默"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">角色类型</label>
                <Select
                  value={charForm.role}
                  onValueChange={(v) => setCharForm({ ...charForm, role: v })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="protagonist">主角</SelectItem>
                    <SelectItem value="antagonist">反派</SelectItem>
                    <SelectItem value="supporting">配角</SelectItem>
                    <SelectItem value="extra">群演</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Separator />

            {/* Main Reference Image */}
            <ImageUploader
              value={charForm.imageUrl}
              onChange={(val) => setCharForm({ ...charForm, imageUrl: val })}
              label="主参考图"
              helpText="上传角色主要参考图，帮助AI保持角色外观一致性"
            />

            {/* Additional Reference Images */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">附加参考图（最多 3 张）</label>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleAddReferenceImage}
                  disabled={charForm.referenceImages.length >= 3}
                  className="gap-1 text-xs"
                >
                  <ImagePlus className="h-3 w-3" />
                  添加
                </Button>
              </div>
              {charForm.referenceImages.length > 0 ? (
                <div className="flex gap-2 flex-wrap">
                  <AnimatePresence>
                    {charForm.referenceImages.map((img, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        className="relative group"
                      >
                        <img
                          src={img}
                          alt={`参考图${i + 1}`}
                          className="w-20 h-20 rounded-lg object-cover border border-border"
                        />
                        <button
                          className="absolute -top-1.5 -right-1.5 bg-destructive text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => handleRemoveReferenceImage(i)}
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">暂无附加参考图</p>
              )}
            </div>

            {/* Seed Value */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">种子值</label>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCharForm({ ...charForm, seedValue: generateSeedValue() })}
                  className="gap-1 text-xs"
                >
                  <Dices className="h-3 w-3" />
                  随机生成
                </Button>
              </div>
              <Input
                value={charForm.seedValue}
                onChange={(e) => setCharForm({ ...charForm, seedValue: e.target.value })}
                placeholder="输入或随机生成种子值"
              />
              <p className="text-xs text-muted-foreground">
                种子值用于保证AI生成同一角色的一致性。同一角色在不同分镜中使用相同种子值可保持外观一致。
              </p>
            </div>

            <Separator />

            {/* Structured Visual Attributes */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">外貌设定</label>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const promptEn = generateCharacterPromptEn(charForm.appearance);
                    setCharForm({
                      ...charForm,
                      appearance: { ...charForm.appearance, promptEn },
                    });
                    toast.success('英文描述已生成');
                  }}
                  className="gap-1 text-xs"
                >
                  <Sparkles className="h-3 w-3" />
                  AI 生成英文描述
                </Button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">性别</label>
                  <Select
                    value={charForm.appearance.gender || ''}
                    onValueChange={(v) => setCharForm({
                      ...charForm,
                      appearance: { ...charForm.appearance, gender: v },
                    })}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="选择" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="female">女性</SelectItem>
                      <SelectItem value="male">男性</SelectItem>
                      <SelectItem value="other">其他</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">年龄段</label>
                  <Input
                    value={charForm.appearance.ageRange || ''}
                    onChange={(e) => setCharForm({
                      ...charForm,
                      appearance: { ...charForm.appearance, ageRange: e.target.value },
                    })}
                    placeholder="如：25-30"
                    className="h-8 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">发型</label>
                  <Input
                    value={charForm.appearance.hairStyle || ''}
                    onChange={(e) => setCharForm({
                      ...charForm,
                      appearance: { ...charForm.appearance, hairStyle: e.target.value },
                    })}
                    placeholder="如：long straight black hair"
                    className="h-8 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">眼睛颜色</label>
                  <Input
                    value={charForm.appearance.eyeColor || ''}
                    onChange={(e) => setCharForm({
                      ...charForm,
                      appearance: { ...charForm.appearance, eyeColor: e.target.value },
                    })}
                    placeholder="如：dark brown"
                    className="h-8 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">肤色</label>
                  <Input
                    value={charForm.appearance.skinTone || ''}
                    onChange={(e) => setCharForm({
                      ...charForm,
                      appearance: { ...charForm.appearance, skinTone: e.target.value },
                    })}
                    placeholder="如：fair"
                    className="h-8 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">体型</label>
                  <Input
                    value={charForm.appearance.bodyType || ''}
                    onChange={(e) => setCharForm({
                      ...charForm,
                      appearance: { ...charForm.appearance, bodyType: e.target.value },
                    })}
                    placeholder="如：slim"
                    className="h-8 text-xs"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">服装</label>
                <Input
                  value={charForm.appearance.clothing || ''}
                  onChange={(e) => setCharForm({
                    ...charForm,
                    appearance: { ...charForm.appearance, clothing: e.target.value },
                  })}
                  placeholder="如：white silk dress, gold hairpin"
                  className="h-8 text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">特征标记</label>
                <Input
                  value={charForm.appearance.distinguishing || ''}
                  onChange={(e) => setCharForm({
                    ...charForm,
                    appearance: { ...charForm.appearance, distinguishing: e.target.value },
                  })}
                  placeholder="如：red mole on left cheek"
                  className="h-8 text-xs"
                />
              </div>

              {/* English Prompt */}
              {charForm.appearance.promptEn && (
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-xs text-muted-foreground">英文描述（AI生成）</label>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-5 px-1.5 text-xs"
                      onClick={() => copyToClipboard(charForm.appearance.promptEn || '')}
                    >
                      复制
                    </Button>
                  </div>
                  <div className="bg-muted/50 rounded-md p-2 text-xs font-mono break-all">
                    {charForm.appearance.promptEn}
                  </div>
                </div>
              )}

              {/* Free text description */}
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">自由文本描述</label>
                <Textarea
                  value={charForm.appearance.text || ''}
                  onChange={(e) => setCharForm({
                    ...charForm,
                    appearance: { ...charForm.appearance, text: e.target.value },
                  })}
                  placeholder="自由描述角色的外貌特征（中文/英文均可）..."
                  className="min-h-[60px] text-xs"
                />
              </div>
            </div>

            <Separator />

            {/* Personality & Description */}
            <div className="space-y-2">
              <label className="text-sm font-medium">性格特点</label>
              <Textarea
                value={charForm.personality}
                onChange={(e) => setCharForm({ ...charForm, personality: e.target.value })}
                placeholder="描述角色的性格特点..."
                className="min-h-[60px]"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">角色简介</label>
              <Textarea
                value={charForm.description}
                onChange={(e) => setCharForm({ ...charForm, description: e.target.value })}
                placeholder="简要描述角色的背景..."
                className="min-h-[60px]"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCharDialog(false)}>取消</Button>
            <Button onClick={editingChar ? handleUpdateCharacter : handleCreateCharacter}>
              {editingChar ? '保存' : '创建'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ==================== Scene Dialog ==================== */}
      <Dialog open={sceneDialog} onOpenChange={(open) => {
        setSceneDialog(open);
        if (!open) setEditingScene(null);
      }}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingScene ? '编辑场景' : '添加场景'}</DialogTitle>
            <DialogDescription>
              {editingScene ? '修改场景信息' : '为新短剧添加场景'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6">
            {/* Basic Info */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">地点 *</label>
                <Input
                  value={sceneForm.location}
                  onChange={(e) => setSceneForm({ ...sceneForm, location: e.target.value })}
                  placeholder="如：林家大宅客厅"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">时间</label>
                <Input
                  value={sceneForm.time}
                  onChange={(e) => setSceneForm({ ...sceneForm, time: e.target.value })}
                  placeholder="如：夜晚、暴雨"
                />
              </div>
            </div>

            {/* Reference Image */}
            <ImageUploader
              value={sceneForm.imageUrl}
              onChange={(val) => setSceneForm({ ...sceneForm, imageUrl: val })}
              label="场景参考图"
              helpText="上传场景参考图，帮助AI保持场景风格一致"
            />

            <Separator />

            {/* Environment Attributes */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">环境设定</label>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const promptEn = generateScenePromptEn(sceneForm.prompt);
                    setSceneForm({
                      ...sceneForm,
                      prompt: { ...sceneForm.prompt, promptEn },
                    });
                    toast.success('英文描述已生成');
                  }}
                  className="gap-1 text-xs"
                >
                  <Sparkles className="h-3 w-3" />
                  AI 生成英文描述
                </Button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">环境类型</label>
                  <Select
                    value={sceneForm.prompt.environmentType || ''}
                    onValueChange={(v) => setSceneForm({
                      ...sceneForm,
                      prompt: { ...sceneForm.prompt, environmentType: v },
                    })}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="选择" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="indoor">室内</SelectItem>
                      <SelectItem value="outdoor">室外</SelectItem>
                      <SelectItem value="mixed">室内外结合</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">建筑风格</label>
                  <Input
                    value={sceneForm.prompt.architecturalStyle || ''}
                    onChange={(e) => setSceneForm({
                      ...sceneForm,
                      prompt: { ...sceneForm.prompt, architecturalStyle: e.target.value },
                    })}
                    placeholder="如：traditional Chinese courtyard"
                    className="h-8 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">光线</label>
                  <Input
                    value={sceneForm.prompt.lighting || ''}
                    onChange={(e) => setSceneForm({
                      ...sceneForm,
                      prompt: { ...sceneForm.prompt, lighting: e.target.value },
                    })}
                    placeholder="如：warm candlelight"
                    className="h-8 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">天气</label>
                  <Input
                    value={sceneForm.prompt.weather || ''}
                    onChange={(e) => setSceneForm({
                      ...sceneForm,
                      prompt: { ...sceneForm.prompt, weather: e.target.value },
                    })}
                    placeholder="如：clear night"
                    className="h-8 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">季节</label>
                  <Select
                    value={sceneForm.prompt.season || ''}
                    onValueChange={(v) => setSceneForm({
                      ...sceneForm,
                      prompt: { ...sceneForm.prompt, season: v },
                    })}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="选择" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="spring">春</SelectItem>
                      <SelectItem value="summer">夏</SelectItem>
                      <SelectItem value="autumn">秋</SelectItem>
                      <SelectItem value="winter">冬</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">色调</label>
                  <Input
                    value={sceneForm.prompt.colorTone || ''}
                    onChange={(e) => setSceneForm({
                      ...sceneForm,
                      prompt: { ...sceneForm.prompt, colorTone: e.target.value },
                    })}
                    placeholder="如：warm golden tones"
                    className="h-8 text-xs"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">关键道具</label>
                <Input
                  value={sceneForm.prompt.keyProps || ''}
                  onChange={(e) => setSceneForm({
                    ...sceneForm,
                    prompt: { ...sceneForm.prompt, keyProps: e.target.value },
                  })}
                  placeholder="如：mahogany table, paper lanterns, silk curtains"
                  className="h-8 text-xs"
                />
              </div>

              {/* English Prompt */}
              {sceneForm.prompt.promptEn && (
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-xs text-muted-foreground">英文描述（AI生成）</label>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-5 px-1.5 text-xs"
                      onClick={() => copyToClipboard(sceneForm.prompt.promptEn || '')}
                    >
                      复制
                    </Button>
                  </div>
                  <div className="bg-muted/50 rounded-md p-2 text-xs font-mono break-all">
                    {sceneForm.prompt.promptEn}
                  </div>
                </div>
              )}

              {/* Free text description */}
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">自由文本描述</label>
                <Textarea
                  value={sceneForm.prompt.text || ''}
                  onChange={(e) => setSceneForm({
                    ...sceneForm,
                    prompt: { ...sceneForm.prompt, text: e.target.value },
                  })}
                  placeholder="自由描述场景的画面氛围（中文/英文均可）..."
                  className="min-h-[60px] text-xs"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSceneDialog(false)}>取消</Button>
            <Button onClick={editingScene ? handleUpdateScene : handleCreateScene}>
              {editingScene ? '保存' : '创建'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Character Confirmation */}
      <AlertDialog open={!!deleteCharId} onOpenChange={() => setDeleteCharId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除角色</AlertDialogTitle>
            <AlertDialogDescription>删除后将无法恢复，确定要删除该角色吗？</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteCharacter} className="bg-destructive text-white hover:bg-destructive/90">
              删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Scene Confirmation */}
      <AlertDialog open={!!deleteSceneId} onOpenChange={() => setDeleteSceneId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除场景</AlertDialogTitle>
            <AlertDialogDescription>删除后将无法恢复，确定要删除该场景吗？</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteScene} className="bg-destructive text-white hover:bg-destructive/90">
              删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
    </TooltipProvider>
  );
}
