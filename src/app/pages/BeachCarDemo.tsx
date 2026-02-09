import React from 'react';
import { BeachCar } from '../components/BeachCar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router';

export default function BeachCarDemo() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0a1628] via-[#0d1a2d] to-[#0a1628] py-12">
      <div className="container mx-auto px-4 max-w-6xl">
        {/* Back button */}
        <Link to="/">
          <Button variant="ghost" className="mb-8 text-cyan-400 hover:text-cyan-300">
            <ArrowLeft className="size-4 mr-2" />
            На главную
          </Button>
        </Link>

        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-righteous text-transparent bg-clip-text bg-gradient-to-r from-[#00d9ff] to-[#00ffaa] mb-4">
            🏖️ Beach Car Animation
          </h1>
          <p className="text-cyan-100/70 text-lg">
            Анимированная машинка едет по пляжу Soul FM
          </p>
        </div>

        {/* Demo sections */}
        <div className="space-y-8">
          {/* Large demo */}
          <Card className="bg-slate-900/50 border-cyan-500/20">
            <CardHeader>
              <CardTitle className="text-cyan-400">Большая сцена</CardTitle>
              <CardDescription>
                Полноразмерная анимация с пальмами и волнами
              </CardDescription>
            </CardHeader>
            <CardContent>
              <BeachCar size="lg" speed={15} showWaves showPalms />
            </CardContent>
          </Card>

          {/* Medium demo */}
          <Card className="bg-slate-900/50 border-cyan-500/20">
            <CardHeader>
              <CardTitle className="text-cyan-400">Средняя сцена</CardTitle>
              <CardDescription>
                Стандартный размер (по умолчанию)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <BeachCar size="md" speed={20} showWaves showPalms />
            </CardContent>
          </Card>

          {/* Small demo */}
          <Card className="bg-slate-900/50 border-cyan-500/20">
            <CardHeader>
              <CardTitle className="text-cyan-400">Компактная сцена</CardTitle>
              <CardDescription>
                Маленький размер для использования в баннерах
              </CardDescription>
            </CardHeader>
            <CardContent>
              <BeachCar size="sm" speed={25} showWaves showPalms />
            </CardContent>
          </Card>

          {/* Fast car */}
          <Card className="bg-slate-900/50 border-cyan-500/20">
            <CardHeader>
              <CardTitle className="text-cyan-400">Быстрая машинка 🏎️</CardTitle>
              <CardDescription>
                Увеличенная скорость (speed=8)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <BeachCar size="md" speed={8} showWaves showPalms />
            </CardContent>
          </Card>

          {/* Minimal version */}
          <Card className="bg-slate-900/50 border-cyan-500/20">
            <CardHeader>
              <CardTitle className="text-cyan-400">Минимальная версия</CardTitle>
              <CardDescription>
                Без пальм и волн - только машинка и пляж
              </CardDescription>
            </CardHeader>
            <CardContent>
              <BeachCar size="md" speed={18} showWaves={false} showPalms={false} />
            </CardContent>
          </Card>
        </div>

        {/* Props documentation */}
        <Card className="mt-12 bg-slate-900/50 border-cyan-500/20">
          <CardHeader>
            <CardTitle className="text-cyan-400">📚 Параметры компонента</CardTitle>
            <CardDescription>
              Как использовать BeachCar в вашем проекте
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="p-4 bg-slate-950/50 rounded-lg border border-cyan-500/10">
                <h3 className="text-cyan-300 font-semibold mb-2">Импорт</h3>
                <pre className="text-sm text-cyan-100/70 font-mono">
                  {`import { BeachCar } from './components/BeachCar';`}
                </pre>
              </div>

              <div className="p-4 bg-slate-950/50 rounded-lg border border-cyan-500/10">
                <h3 className="text-cyan-300 font-semibold mb-2">Использование</h3>
                <pre className="text-sm text-cyan-100/70 font-mono whitespace-pre-wrap">
{`<BeachCar 
  size="md"           // 'sm' | 'md' | 'lg'
  speed={20}          // секунды для одного круга
  showWaves={true}    // показать волны
  showPalms={true}    // показать пальмы
/>`}
                </pre>
              </div>

              <div className="p-4 bg-slate-950/50 rounded-lg border border-cyan-500/10">
                <h3 className="text-cyan-300 font-semibold mb-3">Параметры</h3>
                <div className="space-y-3 text-sm">
                  <div>
                    <span className="text-cyan-400 font-mono">size</span>
                    <span className="text-cyan-100/50"> - размер сцены</span>
                    <ul className="ml-4 mt-1 text-cyan-100/70 space-y-1">
                      <li>• <code className="text-cyan-300">'sm'</code> - компактная (60px машинка, 200px сцена)</li>
                      <li>• <code className="text-cyan-300">'md'</code> - средняя (80px машинка, 300px сцена) - по умолчанию</li>
                      <li>• <code className="text-cyan-300">'lg'</code> - большая (120px машинка, 400px сцена)</li>
                    </ul>
                  </div>
                  <div>
                    <span className="text-cyan-400 font-mono">speed</span>
                    <span className="text-cyan-100/50"> - скорость машинки в секундах (по умолчанию: 20)</span>
                    <ul className="ml-4 mt-1 text-cyan-100/70 space-y-1">
                      <li>• Меньше значение = быстрее едет</li>
                      <li>• Рекомендуемые значения: 8-30</li>
                    </ul>
                  </div>
                  <div>
                    <span className="text-cyan-400 font-mono">showWaves</span>
                    <span className="text-cyan-100/50"> - показывать анимированные волны (по умолчанию: true)</span>
                  </div>
                  <div>
                    <span className="text-cyan-400 font-mono">showPalms</span>
                    <span className="text-cyan-100/50"> - показывать пальмы (по умолчанию: true)</span>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-slate-950/50 rounded-lg border border-cyan-500/10">
                <h3 className="text-cyan-300 font-semibold mb-2">✨ Фичи анимации</h3>
                <ul className="space-y-2 text-sm text-cyan-100/70">
                  <li>• 🚗 Плавное движение машинки слева направо</li>
                  <li>• 🎡 Вращающиеся колеса</li>
                  <li>• 🏄 Доска для серфинга на крыше</li>
                  <li>• ☁️ Облака пыли за машинкой</li>
                  <li>• 🌊 Анимированные волны океана</li>
                  <li>• 🌴 Качающиеся пальмы</li>
                  <li>• ☀️ Пульсирующее солнце</li>
                  <li>• ☁️ Плывущие облака</li>
                  <li>• 🏖️ Пляжный зонтик</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Usage examples */}
        <Card className="mt-8 bg-slate-900/50 border-cyan-500/20">
          <CardHeader>
            <CardTitle className="text-cyan-400">💡 Примеры использования</CardTitle>
            <CardDescription>
              Где можно применить BeachCar в Soul FM Hub
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-sm text-cyan-100/70">
              <div className="p-3 bg-slate-950/50 rounded border border-cyan-500/10">
                <span className="text-cyan-400 font-semibold">🏠 Главная страница</span>
                <p className="mt-1">Декоративный элемент в hero-секции или footer</p>
              </div>
              <div className="p-3 bg-slate-950/50 rounded border border-cyan-500/10">
                <span className="text-cyan-400 font-semibold">📻 Страница радиоплеера</span>
                <p className="mt-1">Фоновая анимация для создания атмосферы</p>
              </div>
              <div className="p-3 bg-slate-950/50 rounded border border-cyan-500/10">
                <span className="text-cyan-400 font-semibold">⏳ Страница загрузки</span>
                <p className="mt-1">Индикатор загрузки с тематической анимацией</p>
              </div>
              <div className="p-3 bg-slate-950/50 rounded border border-cyan-500/10">
                <span className="text-cyan-400 font-semibold">🎵 Плейлисты по жанрам</span>
                <p className="mt-1">Разделитель между секциями контента</p>
              </div>
              <div className="p-3 bg-slate-950/50 rounded border border-cyan-500/10">
                <span className="text-cyan-400 font-semibold">📧 404 страница</span>
                <p className="mt-1">Веселая анимация для страницы ошибки</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}