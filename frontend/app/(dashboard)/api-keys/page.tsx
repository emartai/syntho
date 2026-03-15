'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notFound } from 'next/navigation';
import { FLAGS } from '@/lib/flags';
import { Plus, Copy, Trash2, Key, Check, ExternalLink, Code } from 'lucide-react';
import { format } from 'date-fns';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { api } from '@/lib/api';
import { toast } from 'sonner';

interface ApiKey {
  id: string;
  name: string;
  key_prefix: string;
  scopes: string[];
  usage_count: number;
  last_used_at: string | null;
  expires_at: string | null;
  is_active: boolean;
  created_at: string;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://your-app.onrender.com/api/v1';

const PYTHON_EXAMPLE = `import requests

API_KEY = "sk_live_your_key_here"
BASE_URL = "${API_BASE_URL}"

headers = {
    "Authorization": f"Bearer {API_KEY}",
    "Content-Type": "application/json"
}

# List your datasets
response = requests.get(f"{BASE_URL}/datasets", headers=headers)
datasets = response.json()

# Generate synthetic data
response = requests.post(
    f"{BASE_URL}/generate",
    headers=headers,
    json={
        "original_dataset_id": "dataset-uuid",
        "generation_method": "gaussian_copula"
    }
)
job = response.json()
print(f"Job ID: {job['id']}")`;

const JAVASCRIPT_EXAMPLE = `const API_KEY = "sk_live_your_key_here";
const BASE_URL = "${API_BASE_URL}";

const headers = {
    "Authorization": \`Bearer \${API_KEY}\`,
    "Content-Type": "application/json"
};

// List your datasets
const datasetsRes = await fetch(\`\${BASE_URL}/datasets\`, { headers });
const datasets = await datasetsRes.json();

// Generate synthetic data
const generateRes = await fetch(\`\${BASE_URL}/generate\`, {
    method: "POST",
    headers,
    body: JSON.stringify({
        original_dataset_id: "dataset-uuid",
        generation_method: "gaussian_copula"
    })
});
const job = await generateRes.json();
console.log("Job ID:", job.id);`;

export default function ApiKeysPage() {
  if (!FLAGS.API_KEYS) notFound();

  const queryClient = useQueryClient();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [newKeyScopes, setNewKeyScopes] = useState<string[]>(['generate', 'read']);
  const [createdKey, setCreatedKey] = useState<string | null>(null);
  const [showDocs, setShowDocs] = useState(false);

  const { data: keys, isLoading } = useQuery({
    queryKey: ['api-keys'],
    queryFn: async () => {
      const response = await api.apiKeys.list();
      return response.data as ApiKey[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const response = await api.apiKeys.create({
        name: newKeyName,
        scopes: newKeyScopes,
      });
      return response.data;
    },
    onSuccess: (data) => {
      setCreatedKey(data.key);
      queryClient.invalidateQueries({ queryKey: ['api-keys'] });
      toast.success('API key created successfully');
    },
    onError: (error: any) => {
      toast.error('Failed to create API key', {
        description: error?.response?.data?.detail || error.message,
      });
    },
  });

  const revokeMutation = useMutation({
    mutationFn: async (keyId: string) => {
      await api.apiKeys.delete(keyId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['api-keys'] });
      toast.success('API key revoked');
    },
    onError: (error: any) => {
      toast.error('Failed to revoke API key', {
        description: error?.response?.data?.detail || error.message,
      });
    },
  });

  const handleCreateKey = async () => {
    if (!newKeyName.trim()) {
      toast.error('Please enter a key name');
      return;
    }
    await createMutation.mutateAsync();
  };

  const handleCopyKey = async () => {
    if (createdKey) {
      await navigator.clipboard.writeText(createdKey);
      toast.success('Key copied to clipboard');
    }
  };

  const handleScopeChange = (scope: string, checked: boolean) => {
    if (checked) {
      setNewKeyScopes([...newKeyScopes, scope]);
    } else {
      setNewKeyScopes(newKeyScopes.filter(s => s !== scope));
    }
  };

  const resetCreateModal = () => {
    setIsCreateModalOpen(false);
    setNewKeyName('');
    setNewKeyScopes(['generate', 'read']);
    setCreatedKey(null);
  };

  const formatScopes = (scopes: string[]) => {
    return scopes.map(s => (
      <span
        key={s}
        className="inline-flex items-center rounded-full bg-[rgba(167,139,250,0.10)] px-2 py-0.5 text-xs font-medium text-primary mr-1"
      >
        {s}
      </span>
    ));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="font-display text-2xl font-bold text-text">API Keys</h1>
          <p className="text-sm text-[rgba(241,240,255,0.65)]">
            Manage API keys for programmatic access to Syntho
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowDocs(!showDocs)}>
            <Code className="h-4 w-4 mr-2" />
            {showDocs ? 'Hide Docs' : 'API Docs'}
          </Button>
          <Button onClick={() => setIsCreateModalOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create New API Key
          </Button>
        </div>
      </div>

      {showDocs && (
        <Card>
          <CardHeader>
            <CardTitle>API Documentation</CardTitle>
            <CardDescription>
              Quick start guide for integrating Syntho into your ML pipelines
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="rounded-lg border border-[rgba(167,139,250,0.10)] bg-[rgba(255,255,255,0.04)] p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-[rgba(241,240,255,0.65)]">Base URL</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigator.clipboard.writeText(API_BASE_URL)}
                >
                  <Copy className="h-3 w-3 mr-1" />
                  Copy
                </Button>
              </div>
              <code className="text-sm text-primary">{API_BASE_URL}</code>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              <div className="space-y-3">
                <h4 className="font-medium text-sm">Python</h4>
                <div className="relative">
                  <pre className="rounded-lg bg-[rgba(0,0,0,0.3)] p-4 text-xs text-[rgba(241,240,255,0.87)] overflow-x-auto">
                    <code>{PYTHON_EXAMPLE}</code>
                  </pre>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute top-2 right-2"
                    onClick={() => navigator.clipboard.writeText(PYTHON_EXAMPLE)}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="font-medium text-sm">JavaScript</h4>
                <div className="relative">
                  <pre className="rounded-lg bg-[rgba(0,0,0,0.3)] p-4 text-xs text-[rgba(241,240,255,0.87)] overflow-x-auto">
                    <code>{JAVASCRIPT_EXAMPLE}</code>
                  </pre>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute top-2 right-2"
                    onClick={() => navigator.clipboard.writeText(JAVASCRIPT_EXAMPLE)}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-[rgba(167,139,250,0.10)]">
              <p className="text-sm text-[rgba(241,240,255,0.38)]">
                Rate limit: 60 requests per minute per API key
              </p>
              <Button variant="link" asChild>
                <a href="/api-reference" className="flex items-center">
                  View full API reference
                  <ExternalLink className="h-3 w-3 ml-1" />
                </a>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5 text-primary" />
            Your API Keys
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          ) : keys?.length === 0 ? (
            <div className="rounded-lg border border-[rgba(167,139,250,0.10)] bg-[rgba(255,255,255,0.04)] p-8 text-center">
              <Key className="h-8 w-8 mx-auto text-[rgba(241,240,255,0.38)] mb-3" />
              <p className="text-[rgba(241,240,255,0.65)]">No API keys yet</p>
              <p className="text-sm text-[rgba(241,240,255,0.38)] mt-1">
                Create your first API key to integrate Syntho into your ML pipelines
              </p>
              <Button
                variant="link"
                onClick={() => setIsCreateModalOpen(true)}
                className="mt-4 text-primary"
              >
                Create API Key
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[rgba(167,139,250,0.10)]">
                    <th className="text-left py-3 px-4 text-sm font-medium text-[rgba(241,240,255,0.65)]">
                      Name
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-[rgba(241,240,255,0.65)]">
                      Prefix
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-[rgba(241,240,255,0.65)]">
                      Scopes
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-[rgba(241,240,255,0.65)]">
                      Usage
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-[rgba(241,240,255,0.65)]">
                      Last Used
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-[rgba(241,240,255,0.65)]">
                      Created
                    </th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-[rgba(241,240,255,0.65)]">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {keys?.map((key) => (
                    <tr
                      key={key.id}
                      className="border-b border-[rgba(167,139,250,0.10)] hover:bg-[rgba(255,255,255,0.02)]"
                    >
                      <td className="py-3 px-4 font-medium text-text">
                        {key.name}
                      </td>
                      <td className="py-3 px-4 font-mono text-sm text-[rgba(241,240,255,0.65)]">
                        {key.key_prefix}...
                      </td>
                      <td className="py-3 px-4">
                        {formatScopes(key.scopes)}
                      </td>
                      <td className="py-3 px-4 text-[rgba(241,240,255,0.65)]">
                        {key.usage_count.toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-[rgba(241,240,255,0.65)]">
                        {key.last_used_at
                          ? format(new Date(key.last_used_at), 'MMM d, yyyy HH:mm')
                          : 'Never'}
                      </td>
                      <td className="py-3 px-4 text-[rgba(241,240,255,0.65)]">
                        {format(new Date(key.created_at), 'MMM d, yyyy')}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            if (confirm('Are you sure you want to revoke this key? This action cannot be undone.')) {
                              revokeMutation.mutate(key.id);
                            }
                          }}
                          className="text-red-400 hover:text-red-300 hover:bg-red-400/10"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isCreateModalOpen} onOpenChange={resetCreateModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {createdKey ? 'API Key Created' : 'Create New API Key'}
            </DialogTitle>
            <DialogDescription>
              {createdKey
                ? 'Copy your key now — we won\'t show it again!'
                : 'Give your API key a name and select permissions'}
            </DialogDescription>
          </DialogHeader>

          {createdKey ? (
            <div className="space-y-4">
              <div className="rounded-lg bg-[rgba(251,191,36,0.10)] border border-[rgba(251,191,36,0.20)] p-4">
                <div className="flex items-center gap-2 text-yellow-400 mb-2">
                  <Key className="h-4 w-4" />
                  <span className="text-sm font-medium">Save this key!</span>
                </div>
                <p className="text-xs text-[rgba(241,240,255,0.65)]">
                  We won&apos;t show this key again. Store it securely.
                </p>
              </div>

              <div className="space-y-2">
                <Label>Your API Key</Label>
                <div className="flex gap-2">
                  <code className="flex-1 rounded-lg bg-[rgba(0,0,0,0.3)] p-3 text-sm font-mono text-primary break-all">
                    {createdKey}
                  </code>
                  <Button variant="secondary" onClick={handleCopyKey}>
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <Button onClick={resetCreateModal} className="flex-1">
                  Done
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="keyName">Key Name</Label>
                <Input
                  id="keyName"
                  placeholder="e.g., Production Pipeline"
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                />
                <p className="text-xs text-[rgba(241,240,255,0.38)]">
                  A descriptive name to identify this key
                </p>
              </div>

              <div className="space-y-3">
                <Label>Scopes</Label>
                <div className="space-y-2">
                  {[
                    { id: 'generate', label: 'Generate', desc: 'Create synthetic datasets' },
                    { id: 'read', label: 'Read', desc: 'Access datasets and reports' },
                    { id: 'marketplace', label: 'Marketplace', desc: 'Access marketplace listings' },
                  ].map((scope) => (
                    <label
                      key={scope.id}
                      className="flex items-center gap-3 p-3 rounded-lg border border-[rgba(167,139,250,0.10)] hover:bg-[rgba(255,255,255,0.02)] cursor-pointer"
                    >
                      <Checkbox
                        checked={newKeyScopes.includes(scope.id)}
                        onCheckedChange={(checked) => handleScopeChange(scope.id, checked as boolean)}
                      />
                      <div className="flex-1">
                        <div className="font-medium text-sm">{scope.label}</div>
                        <div className="text-xs text-[rgba(241,240,255,0.38)]">{scope.desc}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <Button variant="outline" onClick={resetCreateModal} className="flex-1">
                  Cancel
                </Button>
                <Button
                  onClick={handleCreateKey}
                  loading={createMutation.isPending}
                  className="flex-1"
                >
                  Create Key
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}