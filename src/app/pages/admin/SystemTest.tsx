import React, { useState } from 'react';
import { AdminLayout } from '../../components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { toast } from 'sonner';
import {
  TestTube,
  Loader2,
  CheckCircle2,
  XCircle,
  Play,
  Sparkles,
  Cloud,
  Clock,
  Radio,
  Newspaper,
  TrendingUp
} from 'lucide-react';
import { motion } from 'motion/react';
import { projectId } from '/utils/supabase/info';
import { getAuthHeaders } from '../../../lib/api';

interface TestResult {
  name: string;
  status: 'pending' | 'running' | 'success' | 'error';
  message?: string;
  duration?: number;
}

export function SystemTest() {
  const [testing, setTesting] = useState(false);
  const [results, setResults] = useState<TestResult[]>([]);

  const tests = [
    { id: 'seed-news', name: 'Seed Test News Data', icon: Newspaper },
    { id: 'generate-weather', name: 'Generate Weather Announcement', icon: Cloud },
    { id: 'generate-time', name: 'Generate Time Announcement', icon: Clock },
    { id: 'generate-station-id', name: 'Generate Station ID', icon: Radio },
    { id: 'schedule-news', name: 'Schedule News Injections', icon: TrendingUp },
  ];

  const runTest = async (testId: string): Promise<TestResult> => {
    const test = tests.find(t => t.id === testId)!;
    const start = Date.now();

    try {
      const headers = await getAuthHeaders();
      switch (testId) {
        case 'seed-news':
          const seedRes = await fetch(
            `https://${projectId}.supabase.co/functions/v1/make-server-06086aa3/seed-news-injection`,
            {
              method: 'POST',
              headers
            }
          );
          const seedData = await seedRes.json();
          if (!seedData.success) throw new Error(seedData.error);
          return {
            name: test.name,
            status: 'success',
            message: `Created ${seedData.news} news articles and ${seedData.voices} voices`,
            duration: Date.now() - start
          };

        case 'generate-weather':
          const weatherRes = await fetch(
            `https://${projectId}.supabase.co/functions/v1/make-server-06086aa3/announcements/weather/generate`,
            {
              method: 'POST',
              headers,
              body: JSON.stringify({
                location: 'Miami',
                voiceId: '21m00Tcm4TlvDq8ikWAM',
                voiceName: 'Professional Voice'
              })
            }
          );
          const weatherData = await weatherRes.json();
          if (!weatherData.success) throw new Error(weatherData.error);
          return {
            name: test.name,
            status: 'success',
            message: 'Weather announcement generated with TTS',
            duration: Date.now() - start
          };

        case 'generate-time':
          const timeRes = await fetch(
            `https://${projectId}.supabase.co/functions/v1/make-server-06086aa3/announcements/time/generate`,
            {
              method: 'POST',
              headers,
              body: JSON.stringify({
                voiceId: '21m00Tcm4TlvDq8ikWAM',
                voiceName: 'Professional Voice'
              })
            }
          );
          const timeData = await timeRes.json();
          if (!timeData.success) throw new Error(timeData.error);
          return {
            name: test.name,
            status: 'success',
            message: 'Time announcement generated with TTS',
            duration: Date.now() - start
          };

        case 'generate-station-id':
          const stationRes = await fetch(
            `https://${projectId}.supabase.co/functions/v1/make-server-06086aa3/announcements/station-id/generate`,
            {
              method: 'POST',
              headers,
              body: JSON.stringify({
                voiceId: '21m00Tcm4TlvDq8ikWAM',
                voiceName: 'Professional Voice'
              })
            }
          );
          const stationData = await stationRes.json();
          if (!stationData.success) throw new Error(stationData.error);
          return {
            name: test.name,
            status: 'success',
            message: 'Station ID generated with TTS',
            duration: Date.now() - start
          };

        case 'schedule-news':
          const scheduleRes = await fetch(
            `https://${projectId}.supabase.co/functions/v1/make-server-06086aa3/news-injection/schedule/run`,
            {
              method: 'POST',
              headers
            }
          );
          const scheduleData = await scheduleRes.json();
          if (!scheduleData.success) throw new Error(scheduleData.error);
          return {
            name: test.name,
            status: 'success',
            message: `Scheduled ${scheduleData.count} news injections`,
            duration: Date.now() - start
          };

        default:
          throw new Error('Unknown test');
      }
    } catch (error: any) {
      return {
        name: test.name,
        status: 'error',
        message: error.message,
        duration: Date.now() - start
      };
    }
  };

  const runAllTests = async () => {
    setTesting(true);
    setResults([]);

    const testResults: TestResult[] = [];

    for (const test of tests) {
      // Update status to running
      setResults([...testResults, { name: test.name, status: 'running' }]);

      const result = await runTest(test.id);
      testResults.push(result);
      setResults([...testResults]);

      // Wait a bit between tests
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    setTesting(false);

    const successCount = testResults.filter(r => r.status === 'success').length;
    const failedCount = testResults.filter(r => r.status === 'error').length;

    if (failedCount === 0) {
      toast.success(`All ${successCount} tests passed! 🎉`);
    } else {
      toast.error(`${failedCount} tests failed, ${successCount} passed`);
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6 pb-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between"
        >
          <div>
            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
              <TestTube className="w-8 h-8 text-[#00d9ff]" />
              System Test Suite
            </h1>
            <p className="text-gray-400 mt-2">
              Test News Injection and Content Announcements systems
            </p>
          </div>

          <Button
            onClick={runAllTests}
            disabled={testing}
            className="bg-gradient-to-r from-[#00d9ff] to-[#00ffaa] text-black"
            size="lg"
          >
            {testing ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Running Tests...
              </>
            ) : (
              <>
                <Play className="w-5 h-5 mr-2" />
                Run All Tests
              </>
            )}
          </Button>
        </motion.div>

        {/* Info */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-gradient-to-r from-[#00d9ff]/10 to-[#00ffaa]/10 border border-[#00d9ff]/30 rounded-lg p-4"
        >
          <div className="flex items-start gap-3">
            <Sparkles className="w-5 h-5 text-[#00d9ff] flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-semibold text-white mb-1">
                What This Tests
              </h3>
              <ul className="text-xs text-gray-300 space-y-1">
                <li>• Creates sample news articles and voices</li>
                <li>• Generates Weather, Time, and Station ID announcements with ElevenLabs TTS</li>
                <li>• Schedules news injections for the next 24 hours</li>
                <li>• Verifies all backend APIs are working correctly</li>
              </ul>
            </div>
          </div>
        </motion.div>

        {/* Test Results */}
        <Card className="bg-[#141414] border-gray-800">
          <CardHeader>
            <CardTitle>Test Results</CardTitle>
            <CardDescription>
              {results.length === 0
                ? 'Click "Run All Tests" to start'
                : `${results.filter(r => r.status === 'success').length}/${tests.length} passed`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {results.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <TestTube className="w-12 h-12 mx-auto mb-3 opacity-20" />
                <p>No tests run yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {tests.map((test, index) => {
                  const result = results.find(r => r.name === test.name);
                  const Icon = test.icon;

                  return (
                    <motion.div
                      key={test.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="bg-white/5 rounded-lg p-4"
                    >
                      <div className="flex items-center gap-4">
                        <div
                          className={`
                            flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center
                            ${result?.status === 'success'
                              ? 'bg-green-500/20'
                              : result?.status === 'error'
                              ? 'bg-red-500/20'
                              : result?.status === 'running'
                              ? 'bg-blue-500/20'
                              : 'bg-gray-500/20'
                            }
                          `}
                        >
                          {result?.status === 'success' ? (
                            <CheckCircle2 className="w-5 h-5 text-green-400" />
                          ) : result?.status === 'error' ? (
                            <XCircle className="w-5 h-5 text-red-400" />
                          ) : result?.status === 'running' ? (
                            <Loader2 className="w-5 h-5 text-blue-400 animate-spin" />
                          ) : (
                            <Icon className="w-5 h-5 text-gray-400" />
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h3 className="text-white font-medium">{test.name}</h3>
                            {result?.status && (
                              <Badge
                                variant={
                                  result.status === 'success'
                                    ? 'default'
                                    : result.status === 'error'
                                    ? 'destructive'
                                    : 'secondary'
                                }
                                className={
                                  result.status === 'success'
                                    ? 'bg-green-500/20 text-green-400'
                                    : result.status === 'running'
                                    ? 'bg-blue-500/20 text-blue-400'
                                    : ''
                                }
                              >
                                {result.status}
                              </Badge>
                            )}
                          </div>

                          {result?.message && (
                            <p className="text-sm text-gray-400 mt-1">{result.message}</p>
                          )}

                          {result?.duration && (
                            <p className="text-xs text-gray-500 mt-1">
                              Completed in {result.duration}ms
                            </p>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="bg-[#141414] border-gray-800">
            <CardHeader>
              <CardTitle className="text-lg">After Testing</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => window.open('/admin/news-injection', '_blank')}
              >
                <Newspaper className="w-4 h-4 mr-2" />
                Open News Injection
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => window.open('/admin/automation', '_blank')}
              >
                <Sparkles className="w-4 h-4 mr-2" />
                Open Content Automation
              </Button>
            </CardContent>
          </Card>

          <Card className="bg-[#141414] border-gray-800">
            <CardHeader>
              <CardTitle className="text-lg">Next Steps</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="text-sm text-gray-400 space-y-2">
                <li className="flex items-start gap-2">
                  <span className="text-[#00d9ff] mt-0.5">1.</span>
                  <span>Go to News Injection and activate an injection rule</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#00d9ff] mt-0.5">2.</span>
                  <span>Generate more voice-overs for different news</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#00d9ff] mt-0.5">3.</span>
                  <span>Check the Queue tab to see scheduled injections</span>
                </li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
}