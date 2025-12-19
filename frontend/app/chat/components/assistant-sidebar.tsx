"use client";

import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Search, Plus } from "lucide-react";

export function AssistantSidebar() {
  return (
    <div className="flex h-full flex-col border-r bg-card">
      {/* 头部：搜索 + 新建 */}
      <div className="border-b p-4 space-y-3">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="搜索助手..."
              className="pl-9"
            />
          </div>
          <Button size="icon" variant="outline">
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* 助手列表 */}
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-2">
          {/* 示例助手项 */}
          {[
            { name: "斯坦福教授", model: "claude-4.5-sonnet", icon: "🎓" },
            { name: "API 文档助手", model: "gpt-4.1-turbo-16k", icon: "📚" },
            { name: "Zustand reducer Expert", model: "gpt-4.1-mini", icon: "⚡" },
            { name: "React Native 编码助手", model: "gpt-4.1-mini", icon: "📱" },
            { name: "编程专家代理", model: "gpt-4.1-mini", icon: "💻" },
            { name: "软件开发入门", model: "gpt-4.1-mini", icon: "🚀" },
            { name: "别墅 TypeScript 建筑专家", model: "gpt-4.1-mini", icon: "🏗️" },
          ].map((assistant, index) => (
            <Card
              key={index}
              className="p-3 cursor-pointer hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-start gap-3">
                <div className="text-2xl">{assistant.icon}</div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm truncate">
                    {assistant.name}
                  </div>
                  <div className="text-xs text-muted-foreground truncate">
                    {assistant.model}
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </ScrollArea>

      {/* 底部：查看全部 */}
      <div className="border-t p-4">
        <Button variant="outline" className="w-full" size="sm">
          查看全部助手
        </Button>
      </div>
    </div>
  );
}
