import { AdaptiveCard, StatCard, MetricCard, IntensityCard } from "@/components/cards";
import { ArrowLeft } from "lucide-react";
import { ThemeSwitcher } from "@/components/theme-switcher";
import Link from "next/link";

export default function ThemeDemoPage() {
  return (
    <div
      className="min-h-screen relative"
      style={{
        backgroundImage: "url(/theme/chrismas/background.svg)",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundAttachment: "fixed",
        backgroundRepeat: "no-repeat",
      }}
    >
      {/* 背景遮罩层 - 让背景变亮（上下均匀） */}
      <div 
        className="fixed inset-0 pointer-events-none"
        style={{
          background: "linear-gradient(180deg, rgba(255, 255, 255, 0.18) 0%, rgba(255, 255, 255, 0.12) 50%, rgba(255, 255, 255, 0.18) 100%)",
          zIndex: 0,
        }}
      />

      {/* 固定顶部 Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/80 backdrop-blur-sm">
        <div className="container flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              返回首页
            </Link>
            <div className="h-6 w-px bg-border" />
            <h1 className="text-lg font-semibold">自适应主题系统演示</h1>
          </div>
          <ThemeSwitcher />
        </div>
      </header>

      {/* 主内容区 */}
      <div className="container px-4 py-8 relative">
        <div className="max-w-7xl mx-auto space-y-8 relative">
          {/* 页面说明 */}
          <div className="space-y-2 text-center">
            <h2 className="text-3xl font-bold">自适应主题卡片系统</h2>
            <p className="text-muted-foreground">
              通过 CSS 变量自动适配所有主题 · 玻璃拟态效果 · 装饰可拔插
            </p>
          </div>

          {/* 自适应卡片展示 */}
          <section className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <AdaptiveCard>
                <StatCard 
                  label="当前请求数量" 
                  value="249" 
                  subtitle="较昨日 +12%" 
                  size="lg"
                />
              </AdaptiveCard>

              <AdaptiveCard>
                <StatCard 
                  label="即时处理请求" 
                  value="8" 
                  subtitle="实时处理中" 
                  size="lg"
                />
              </AdaptiveCard>

              <AdaptiveCard>
                <StatCard 
                  label="成功的实率" 
                  value="87.1%" 
                  subtitle="过去 24 小时" 
                  size="lg"
                />
              </AdaptiveCard>
            </div>
          </section>

          {/* 更多示例 */}
          <section className="space-y-4">
            <h3 className="text-2xl font-semibold text-center">统计卡片</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <AdaptiveCard>
                <MetricCard label="API 调用" value="17,065" />
              </AdaptiveCard>

              <AdaptiveCard>
                <MetricCard label="响应时间" value="1,729ms" />
              </AdaptiveCard>

              <AdaptiveCard>
                <MetricCard label="成本统计" value="$73,509" />
              </AdaptiveCard>

              <AdaptiveCard>
                <MetricCard label="活跃用户" value="2,350" />
              </AdaptiveCard>
            </div>
          </section>

          {/* 不同尺寸对比 */}
          <section className="space-y-4">
            <h3 className="text-2xl font-semibold text-center">不同尺寸</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <AdaptiveCard>
                <IntensityCard level={1} />
              </AdaptiveCard>

              <AdaptiveCard>
                <IntensityCard level={2} />
              </AdaptiveCard>

              <AdaptiveCard>
                <IntensityCard level={3} />
              </AdaptiveCard>
            </div>
          </section>

 
          {/* 提示信息 */}
          <div className="mt-12 p-6 rounded-lg border border-dashed border-white/30 bg-black/20 backdrop-blur-sm">
            <h3 className="text-lg font-semibold mb-2 text-white">💡 自适应主题系统</h3>
            <ul className="space-y-1 text-sm text-white/80">
              <li>• <strong>背景</strong>：圣诞雪景图片（7MB SVG）</li>
              <li>• <strong>卡片</strong>：AdaptiveCard - 通过 CSS 变量自动适配所有主题</li>
              <li>• <strong>玻璃拟态</strong>：半透明背景 + 背景模糊效果</li>
              <li>• <strong>圣诞装饰</strong>：右上角圣诞帽 + 左侧冰霜（仅圣诞主题显示）</li>
              <li>• <strong>主题切换</strong>：点击右上角切换主题，卡片样式自动更新</li>
              <li>• <strong>侧边栏</strong>：AdaptiveSidebar - 唯一通用组件，支持所有主题</li>
              <li>• <strong>扩展性</strong>：添加新主题只需修改 globals.css，无需修改组件代码</li>
              <li>• <strong>性能</strong>：完全由 CSS 控制，无需 JS 判断主题</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
