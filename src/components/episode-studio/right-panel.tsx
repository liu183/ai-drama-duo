'use client';

import { Film, Users, MapPin, Mic, Clock } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { STATUS_MAP } from '@/lib/constants';
import type { Episode, Character, Scene, Storyboard } from '@/types';

interface RightPanelProps {
  episodeNumber: number;
  episode: Episode;
  characters: Character[];
  scenes: Scene[];
  storyboards: Storyboard[];
}

export function RightPanel({
  episodeNumber,
  episode,
  characters,
  scenes,
  storyboards,
}: RightPanelProps) {
  return (
    <div className="p-4 space-y-4" style={{ width: 320 }}>
      {/* Episode Info */}
      <div>
        <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
          <Film className="h-4 w-4" />
          集数信息
        </h4>
        <Card className="bg-muted/30">
          <CardContent className="p-3 space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-muted-foreground">集数</span>
              <span>第 {episodeNumber} 集</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">状态</span>
              <Badge className={`text-xs ${STATUS_MAP[episode.status]?.color || ''}`}>
                {STATUS_MAP[episode.status]?.label || episode.status}
              </Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">时长</span>
              <span>{episode.duration > 0 ? `${episode.duration.toFixed(0)}秒` : '未设置'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">分镜数</span>
              <span>{storyboards.length}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Separator />

      {/* Characters */}
      <div>
        <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
          <Users className="h-4 w-4" />
          角色列表 ({characters.length})
        </h4>
        <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar">
          {characters.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4">
              暂无角色，请在第3步提取
            </p>
          ) : (
            characters.map((char) => (
              <Card key={char.id} className="bg-muted/30">
                <CardContent className="p-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{char.name}</span>
                    <Badge variant="outline" className="text-xs">
                      {char.role === 'protagonist' ? '主角' : char.role === 'antagonist' ? '反派' : '配角'}
                    </Badge>
                  </div>
                  {char.voiceStyle && (
                    <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                      <Mic className="h-3 w-3" />
                      {char.voiceStyle}
                    </p>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>

      <Separator />

      {/* Scenes */}
      <div>
        <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
          <MapPin className="h-4 w-4" />
          场景列表 ({scenes.length})
        </h4>
        <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar">
          {scenes.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4">
              暂无场景
            </p>
          ) : (
            scenes.map((scene) => (
              <Card key={scene.id} className="bg-muted/30">
                <CardContent className="p-2.5">
                  <p className="text-sm font-medium">{scene.location || '未命名'}</p>
                  {scene.time && (
                    <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {scene.time}
                    </p>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
