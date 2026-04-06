'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Copy, KeyRound, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

import { useAuth } from '@/hooks/useAuth';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const CODE_SAMPLES = {
  python: `import requests\n\nheaders = {"Authorization": "Bearer sk_live_your_key"}\nrequests.get("${process.env.NEXT_PUBLIC_API_URL}/api/v1/synthetic", headers=headers)`,
  javascript: `await fetch("${process.env.NEXT_PUBLIC_API_URL}/api/v1/synthetic", {\n  headers: { Authorization: "Bearer sk_live_your_key" }\n});`,
  curl: `curl ${process.env.NEXT_PUBLIC_API_URL}/api/v1/synthetic \\\n  -H "Authorization: Bearer sk_live_your_key"`,
};

export default function ApiKeysPage() {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [scopes, setScopes] = useState<string[]>(['read', 'generate']);
  const [createdKey, setCreatedKey] = useState<string | null>(null);

  const isFreePlan = profile?.plan === 'free';

  const apiKeysQuery = useQuery({
    queryKey: ['api-keys'],
    queryFn: async () => {
      const response = await api.apiKeys.list();
      return response.data || [];
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const response = await api.apiKeys.create({
        name: name.trim() || 'Default key',
        scopes,
      });
      return response.data;
    },
    onSuccess: (data) => {
      setCreatedKey(data.key);
      setName('');
      toast.success('API key created');
      queryClient.invalidateQueries({ queryKey: ['api-keys'] });
    },
    onError: (error: any) => {
      toast.error('Failed to create API key', {
        description: error?.response?.data?.detail?.message || error?.response?.data?.detail || error?.message,
      });
    },
  });

  const revokeMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.apiKeys.revoke(id);
    },
    onSuccess: () => {
      toast.success('API key revoked');
      queryClient.invalidateQueries({ queryKey: ['api-keys'] });
    },
    onError: () => {
      toast.error('Failed to revoke API key');
    },
  });

  const baseUrl = useMemo(() => process.env.NEXT_PUBLIC_API_URL || '', []);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>API Keys</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-[rgba(241,240,255,0.65)]">Integrate Syntho into your ML pipeline.</p>

          {isFreePlan ? (
            <div className="rounded-xl border border-[rgba(167,139,250,0.18)] bg-[rgba(167,139,250,0.08)] p-4">
              <p className="text-sm text-text">API keys are available on Pro and Growth plans.</p>
              <Button className="mt-3" asChild>
                <a href="/settings/billing">Upgrade to Pro</a>
              </Button>
            </div>
          ) : (
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button>Create New API Key</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New API Key</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Production pipeline key"
                  />
                  <div className="space-y-3">
                    {['read', 'generate'].map((scope) => (
                      <label key={scope} className="flex items-center gap-3 text-sm text-text">
                        <Checkbox
                          checked={scopes.includes(scope)}
                          onCheckedChange={(checked) => {
                            setScopes((prev) =>
                              checked ? [...new Set([...prev, scope])] : prev.filter((item) => item !== scope)
                            );
                          }}
                        />
                        {scope}
                      </label>
                    ))}
                  </div>
                  <Button
                    onClick={() => createMutation.mutate()}
                    disabled={createMutation.isPending || scopes.length === 0}
                    className="w-full"
                  >
                    Create key
                  </Button>

                  {createdKey ? (
                    <div className="rounded-xl border border-[rgba(6,182,212,0.18)] bg-[rgba(6,182,212,0.08)] p-4">
                      <p className="mb-2 text-xs uppercase tracking-wide text-[rgba(241,240,255,0.45)]">
                        Save this key. We will not show it again.
                      </p>
                      <div className="flex items-center gap-2 rounded-lg bg-black/20 p-3 font-mono text-xs text-cyan-300">
                        <span className="flex-1 break-all">{createdKey}</span>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={async () => {
                            await navigator.clipboard.writeText(createdKey);
                            toast.success('API key copied');
                          }}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ) : null}
                </div>
              </DialogContent>
            </Dialog>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Keys</CardTitle>
        </CardHeader>
        <CardContent>
          {apiKeysQuery.isLoading ? (
            <p className="text-sm text-[rgba(241,240,255,0.45)]">Loading API keys…</p>
          ) : apiKeysQuery.data?.length ? (
            <div className="space-y-3">
              {apiKeysQuery.data.map((apiKey: any) => (
                <div
                  key={apiKey.id}
                  className="flex flex-col gap-3 rounded-xl border border-[rgba(167,139,250,0.12)] p-4 md:flex-row md:items-center md:justify-between"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-sm text-text">
                      <KeyRound className="h-4 w-4 text-primary" />
                      <span>{apiKey.name}</span>
                      <span className="font-mono text-xs text-[rgba(241,240,255,0.45)]">{apiKey.key_prefix}</span>
                    </div>
                    <p className="text-xs text-[rgba(241,240,255,0.45)]">
                      Scopes: {(apiKey.scopes || []).join(', ')} · Usage: {apiKey.usage_count || 0}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    className="text-red-400 hover:text-red-300"
                    onClick={() => revokeMutation.mutate(apiKey.id)}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Revoke
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-[rgba(241,240,255,0.45)]">No API keys yet.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Quick Start</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg border border-[rgba(167,139,250,0.12)] bg-[rgba(255,255,255,0.03)] p-3 text-sm text-[rgba(241,240,255,0.65)]">
            Base URL: <span className="font-mono text-cyan-300">{baseUrl}</span>
          </div>
          <Tabs defaultValue="python">
            <TabsList>
              <TabsTrigger value="python">Python</TabsTrigger>
              <TabsTrigger value="javascript">JavaScript</TabsTrigger>
              <TabsTrigger value="curl">cURL</TabsTrigger>
            </TabsList>
            <TabsContent value="python">
              <pre className="overflow-x-auto rounded-xl bg-black/20 p-4 text-xs text-cyan-300">{CODE_SAMPLES.python}</pre>
            </TabsContent>
            <TabsContent value="javascript">
              <pre className="overflow-x-auto rounded-xl bg-black/20 p-4 text-xs text-cyan-300">{CODE_SAMPLES.javascript}</pre>
            </TabsContent>
            <TabsContent value="curl">
              <pre className="overflow-x-auto rounded-xl bg-black/20 p-4 text-xs text-cyan-300">{CODE_SAMPLES.curl}</pre>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
