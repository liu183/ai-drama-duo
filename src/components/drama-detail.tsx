'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
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
import {
  dramaApi,
  characterApi,
  sceneApi,
} from '@/lib/api';
import { toast } from 'sonner';
import type { DramaItem } from './drama-list';

// ==================== Types ====================
interface Episode {
  id: string;
  episodeNumber: number;
  title: string;
  content: string;
  scriptContent: string;
  status: string;
  duration: number;
}

interface Character {
  id: string;
  name: string;
  role: string;
  description: string;
  appearance: string;
  personality: string;
  voiceStyle: string;
  voiceProvider: string;
  imageUrl: string;
  sortOrder: number;
}

interface Scene {
  id: string;
  location: string;
  time: string;
  prompt: string;
  status: string;
  storyboardCount: number;
  imageUrl: string;
}

interface DramaDetail extends DramaItem {
  episodes?: Episode[];
  characters?: Character[];
  scenes?: Scene[];
  _count?: { episodes: number; characters: number; scenes: number };
}

type DramaDetailProps = {
  dramaId: string;
  onBack: () => void;
  onEnterStudio: (dramaId: string, episodeId: string, episodeNumber: number) => void;
  refreshKey?: number;
};

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  draft: { label: '草稿', color: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300' },
  in_progress: { label: '进行中', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
  scripted: { label: '已编剧', color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' },
  completed: { label: '已完成', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
  failed: { label: '失败', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
  pending: { label: '待处理', color: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300' },
};

const ROLE_MAP: Record<string, string> = {
  protagonist: '主角',
  antagonist: '反派',
  supporting: '配角',
  extra: '群演',
};

const GENRES = ['都市', '古装', '玄幻', '悬疑', '甜宠', '搞笑', '励志', '科幻', '其他'];

const STYLES = [
  { value: 'realistic', label: '真实' },
  { value: 'anime', label: '动漫' },
  { value: 'ghibli', label: '吉卜力' },
  { value: 'cinematic', label: '电影' },
  { value: 'comic', label: '漫画' },
  { value: 'watercolor', label: '水彩' },
];

const STATUS_OPTIONS = [
  { value: 'draft', label: '草稿' },
  { value: 'in_progress', label: '进行中' },
  { value: 'completed', label: '已完成' },
  { value: 'failed', label: '失败' },
];

// ==================== Component ====================
export default function DramaDetailView({
  dramaId,
  onBack,
  onEnterStudio,
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
  const [charForm, setCharForm] = useState({
    name: '',
    role: 'supporting',
    description: '',
    appearance: '',
    personality: '',
  });
  const [sceneForm, setSceneForm] = useState({
    location: '',
    time: '',
    prompt: '',
  });

  const loadDrama = useCallback(async () => {
    setLoading(true);
    try {
      const data = await dramaApi.get(dramaId);
      setDrama(data);
    } catch {
      toast.error('加载短剧详情失败');
    } finally {
      setLoading(false);
    }
  }, [dramaId]);

  useEffect(() => {
    loadDrama();
  }, [loadDrama]);

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

  const handleCreateCharacter = async () => {
    if (!charForm.name.trim()) {
      toast.error('请输入角色名称');
      return;
    }
    try {
      await characterApi.create({ dramaId, ...charForm });
      toast.success('角色创建成功');
      setCharDialog(false);
      setCharForm({ name: '', role: 'supporting', description: '', appearance: '', personality: '' });
      loadDrama();
    } catch {
      toast.error('创建角色失败');
    }
  };

  const handleUpdateCharacter = async () => {
    if (!editingChar) return;
    try {
      await characterApi.update(editingChar.id, charForm);
      toast.success('角色更新成功');
      setCharDialog(false);
      setEditingChar(null);
      setCharForm({ name: '', role: 'supporting', description: '', appearance: '', personality: '' });
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
    setCharForm({
      name: char.name,
      role: char.role,
      description: char.description,
      appearance: char.appearance,
      personality: char.personality,
    });
    setCharDialog(true);
  };

  const handleCreateScene = async () => {
    if (!sceneForm.location.trim()) {
      toast.error('请输入场景地点');
      return;
    }
    try {
      await sceneApi.create({ dramaId, ...sceneForm });
      toast.success('场景创建成功');
      setSceneDialog(false);
      setSceneForm({ location: '', time: '', prompt: '' });
      loadDrama();
    } catch {
      toast.error('创建场景失败');
    }
  };

  const handleDeleteScene = async () => {
    if (!deleteSceneId) return;
    try {
      await fetch(`/api/scenes/${deleteSceneId}`, { method: 'DELETE' });
      toast.success('场景删除成功');
      setDeleteSceneId(null);
      loadDrama();
    } catch {
      toast.error('删除场景失败');
    }
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

      <Tabs defaultValue="episodes" className="space-y-4">
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
                    <textarea
                      className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      value={editForm.description as string}
                      onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
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
              <Button size="sm" onClick={() => {
                setEditingChar(null);
                setCharForm({ name: '', role: 'supporting', description: '', appearance: '', personality: '' });
                setCharDialog(true);
              }} className="gap-1.5">
                <Plus className="h-3.5 w-3.5" />
                添加角色
              </Button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {(drama.characters || []).map((char) => (
                <motion.div
                  key={char.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <Card className="overflow-hidden">
                    <div className="h-32 bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center">
                      {char.imageUrl ? (
                        <img src={char.imageUrl} alt={char.name} className="w-full h-full object-cover" />
                      ) : (
                        <Users className="h-10 w-10 text-primary/20" />
                      )}
                    </div>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold">{char.name}</h3>
                        <Badge variant="outline" className="text-xs">
                          {ROLE_MAP[char.role] || char.role}
                        </Badge>
                      </div>
                      {char.appearance && (
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                          {char.appearance}
                        </p>
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
              ))}
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
              <Button size="sm" onClick={() => {
                setEditingScene(null);
                setSceneForm({ location: '', time: '', prompt: '' });
                setSceneDialog(true);
              }} className="gap-1.5">
                <Plus className="h-3.5 w-3.5" />
                添加场景
              </Button>
            </div>
            <div className="space-y-3">
              {(drama.scenes || []).map((scene) => (
                <motion.div
                  key={scene.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <Card className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
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
                          </div>
                          {scene.prompt && (
                            <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                              {scene.prompt}
                            </p>
                          )}
                          <p className="text-xs text-muted-foreground mt-2">
                            {scene.storyboardCount} 个分镜
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive shrink-0"
                          onClick={() => setDeleteSceneId(scene.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Character Dialog */}
      <Dialog open={charDialog} onOpenChange={(open) => {
        setCharDialog(open);
        if (!open) setEditingChar(null);
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingChar ? '编辑角色' : '添加角色'}</DialogTitle>
            <DialogDescription>
              {editingChar ? '修改角色信息' : '为新短剧添加角色'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
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
            <div className="space-y-2">
              <label className="text-sm font-medium">外貌描述</label>
              <textarea
                className="flex min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                value={charForm.appearance}
                onChange={(e) => setCharForm({ ...charForm, appearance: e.target.value })}
                placeholder="描述角色的外貌特征..."
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">性格特点</label>
              <textarea
                className="flex min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                value={charForm.personality}
                onChange={(e) => setCharForm({ ...charForm, personality: e.target.value })}
                placeholder="描述角色的性格特点..."
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">角色简介</label>
              <textarea
                className="flex min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                value={charForm.description}
                onChange={(e) => setCharForm({ ...charForm, description: e.target.value })}
                placeholder="简要描述角色的背景..."
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

      {/* Scene Dialog */}
      <Dialog open={sceneDialog} onOpenChange={setSceneDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingScene ? '编辑场景' : '添加场景'}</DialogTitle>
            <DialogDescription>
              {editingScene ? '修改场景信息' : '为新短剧添加场景'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
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
            <div className="space-y-2">
              <label className="text-sm font-medium">画面描述</label>
              <textarea
                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                value={sceneForm.prompt}
                onChange={(e) => setSceneForm({ ...sceneForm, prompt: e.target.value })}
                placeholder="描述场景的画面氛围..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSceneDialog(false)}>取消</Button>
            <Button onClick={handleCreateScene}>创建</Button>
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
  );
}
