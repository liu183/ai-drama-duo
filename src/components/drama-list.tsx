'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus,
  Search,
  Film,
  MoreVertical,
  Trash2,
  Edit2,
  Layers,
  Play,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';
import { dramaApi } from '@/lib/api';
import { toast } from 'sonner';

// ==================== Types ====================
export interface DramaItem {
  id: string;
  title: string;
  description: string;
  genre: string;
  style: string;
  totalEpisodes: number;
  totalDuration: number;
  status: string;
  thumbnail: string;
  tags: string;
  createdAt: string;
  updatedAt: string;
  episodes?: { id: string; status: string }[];
  characters?: { id: string }[];
  scenes?: { id: string }[];
  _count?: { episodes: number; characters: number; scenes: number };
}

type DramaListProps = {
  onSelectDrama: (id: string) => void;
  refreshKey?: number;
};

const GENRES = [
  '都市', '古装', '玄幻', '悬疑', '甜宠', '搞笑', '励志', '科幻', '其他',
];

const STYLES = [
  { value: 'realistic', label: '真实' },
  { value: 'anime', label: '动漫' },
  { value: 'ghibli', label: '吉卜力' },
  { value: 'cinematic', label: '电影' },
  { value: 'comic', label: '漫画' },
  { value: 'watercolor', label: '水彩' },
];

const STATUS_MAP: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' }> = {
  draft: { label: '草稿', variant: 'secondary' },
  in_progress: { label: '进行中', variant: 'default' },
  completed: { label: '已完成', variant: 'outline' },
  failed: { label: '失败', variant: 'destructive' },
};

const STYLE_LABELS: Record<string, string> = {
  realistic: '真实',
  anime: '动漫',
  ghibli: '吉卜力',
  cinematic: '电影',
  comic: '漫画',
  watercolor: '水彩',
};

// ==================== Component ====================
export default function DramaListView({ onSelectDrama }: DramaListProps) {
  const [dramas, setDramas] = useState<DramaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [createForm, setCreateForm] = useState({
    title: '',
    description: '',
    genre: '都市',
    style: 'realistic',
    totalEpisodes: 10,
  });
  const [creating, setCreating] = useState(false);

  const loadDramas = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = { page: '1', pageSize: '50' };
      if (statusFilter !== 'all') params.status = statusFilter;
      if (search) params.keyword = search;
      const res = await dramaApi.list(params);
      setDramas(res.data || res.items || res || []);
    } catch {
      toast.error('加载项目列表失败');
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter]);

  useEffect(() => {
    loadDramas();
  }, [loadDramas]);

  const handleCreate = async () => {
    if (!createForm.title.trim()) {
      toast.error('请输入剧名');
      return;
    }
    setCreating(true);
    try {
      await dramaApi.create(createForm);
      toast.success('创建成功');
      setCreateOpen(false);
      setCreateForm({ title: '', description: '', genre: '都市', style: 'realistic', totalEpisodes: 10 });
      loadDramas();
    } catch {
      toast.error('创建失败');
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await dramaApi.delete(deleteId);
      toast.success('删除成功');
      setDeleteId(null);
      loadDramas();
    } catch {
      toast.error('删除失败');
    }
  };

  const filteredDramas = useMemo(() => {
    return dramas;
  }, [dramas]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">我的短剧</h1>
          <p className="text-muted-foreground text-sm mt-1">
            管理 AI 短剧创作项目，点击卡片进入详情
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          新建短剧
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="搜索剧名、描述、类型..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-36">
            <SelectValue placeholder="状态筛选" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部状态</SelectItem>
            <SelectItem value="draft">草稿</SelectItem>
            <SelectItem value="in_progress">进行中</SelectItem>
            <SelectItem value="completed">已完成</SelectItem>
            <SelectItem value="failed">失败</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Drama Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Card key={i} className="overflow-hidden">
              <Skeleton className="h-40 w-full" />
              <CardContent className="p-4 space-y-2">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-4 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredDramas.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center justify-center py-20 text-center"
        >
          <Film className="h-16 w-16 text-muted-foreground/30 mb-4" />
          <h3 className="text-lg font-medium text-muted-foreground">暂无短剧项目</h3>
          <p className="text-sm text-muted-foreground/70 mt-1">
            点击「新建短剧」开始你的创作之旅
          </p>
        </motion.div>
      ) : (
        <motion.div
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
          initial="hidden"
          animate="show"
          variants={{
            hidden: {},
            show: { transition: { staggerChildren: 0.05 } },
          }}
        >
          <AnimatePresence>
            {filteredDramas.map((drama) => (
              <motion.div
                key={drama.id}
                layout
                variants={{
                  hidden: { opacity: 0, y: 20 },
                  show: { opacity: 1, y: 0 },
                }}
                exit={{ opacity: 0, scale: 0.95 }}
              >
                <Card
                  className="group overflow-hidden cursor-pointer hover:shadow-lg transition-all duration-300 hover:-translate-y-1"
                  onClick={() => onSelectDrama(drama.id)}
                >
                  {/* Thumbnail */}
                  <div className="relative h-40 bg-gradient-to-br from-primary/20 via-primary/5 to-secondary overflow-hidden">
                    {drama.thumbnail ? (
                      <img
                        src={drama.thumbnail}
                        alt={drama.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Film className="h-12 w-12 text-primary/20" />
                      </div>
                    )}
                    {/* Status badge */}
                    <div className="absolute top-2 left-2">
                      <Badge variant={STATUS_MAP[drama.status]?.variant || 'secondary'}>
                        {STATUS_MAP[drama.status]?.label || drama.status}
                      </Badge>
                    </div>
                    {/* Menu */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="absolute top-1 right-1 h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity bg-black/40 hover:bg-black/60 text-white"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectDrama(drama.id);
                          }}
                        >
                          <Edit2 className="h-4 w-4 mr-2" />
                          编辑
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteId(drama.id);
                          }}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          删除
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <CardContent className="p-4">
                    <h3 className="font-semibold text-base truncate">{drama.title}</h3>
                    <p className="text-sm text-muted-foreground line-clamp-1 mt-1">
                      {drama.description || '暂无描述'}
                    </p>
                    <div className="flex items-center gap-2 mt-3 flex-wrap">
                      {drama.genre && (
                        <Badge variant="outline" className="text-xs">
                          {drama.genre}
                        </Badge>
                      )}
                      <Badge variant="outline" className="text-xs">
                        {STYLE_LABELS[drama.style] || drama.style}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between mt-3 pt-3 border-t text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Layers className="h-3 w-3" />
                        {drama.totalEpisodes} 集
                      </span>
                      <span className="flex items-center gap-1">
                        <Play className="h-3 w-3" />
                        {drama.totalDuration > 0 ? `${drama.totalDuration.toFixed(0)}分钟` : '未开始'}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      )}

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>新建短剧</DialogTitle>
            <DialogDescription>填写短剧基本信息，开始 AI 辅助创作</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">剧名 *</label>
              <Input
                placeholder="请输入剧名"
                value={createForm.title}
                onChange={(e) => setCreateForm({ ...createForm, title: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">简介</label>
              <textarea
                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                placeholder="请输入短剧简介..."
                value={createForm.description}
                onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">类型</label>
                <Select
                  value={createForm.genre}
                  onValueChange={(v) => setCreateForm({ ...createForm, genre: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
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
                  value={createForm.style}
                  onValueChange={(v) => setCreateForm({ ...createForm, style: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STYLES.map((s) => (
                      <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">总集数</label>
              <Input
                type="number"
                min={1}
                max={100}
                value={createForm.totalEpisodes}
                onChange={(e) =>
                  setCreateForm({
                    ...createForm,
                    totalEpisodes: parseInt(e.target.value) || 1,
                  })
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              取消
            </Button>
            <Button onClick={handleCreate} disabled={creating}>
              {creating ? '创建中...' : '创建'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>
              此操作将删除该短剧及其所有相关数据（角色、场景、分镜等），且无法恢复。确定要继续吗？
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-white hover:bg-destructive/90">
              删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
