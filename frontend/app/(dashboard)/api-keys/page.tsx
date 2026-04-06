'use client'

import { useEffect, useMemo, useState } from 'react'
import { Copy, KeyRound, Trash2 } from 'lucide-react'

import { useAuth } from '@/hooks/useAuth'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { toast } from 'sonner'

interface ApiKeyRow {
  id: string
  name: string
  key_prefix: string
  scopes: string[]
  usage_count: number
  last_used_at?: string | null
  created_at: string
  is_active: boolean
}

export default function ApiKeysPage() {
  const { profile } = useAuth()
  const [keys, setKeys] = useState<ApiKeyRow[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [name, setName] = useState('')
  const [scopes, setScopes] = useState<string[]>(['read', 'generate'])
  const [createdKey, setCreatedKey] = useState<string | null>(null)

  const plan = (profile?.plan ?? 'free').toLowerCase()
  const paidPlan = plan === 'pro' || plan === 'growth'

  const baseUrl = process.env.NEXT_PUBLIC_API_URL ?? 'https://api.example.com'

  const pythonSnippet = useMemo(
    () => `import requests\n\nAPI_KEY = \"sk_live_...\"\nBASE = \"${baseUrl}\"\nheaders = {\"Authorization\": f\"Bearer {API_KEY}\"}\n\n# list datasets\nprint(requests.get(f\"{BASE}/api/v1/datasets\", headers=headers).json())\n\n# start generation\npayload = {\"dataset_id\": \"<dataset-id>\", \"method\": \"gaussian_copula\"}\njob = requests.post(f\"{BASE}/api/v1/generate\", json=payload, headers=headers).json()\nprint(job)\n\n# poll status\nstatus = requests.get(f\"{BASE}/api/v1/generate/{job['id']}/status\", headers=headers).json()\nprint(status)\n\n# download\nprint(requests.get(f\"{BASE}/api/v1/synthetic/{job['id']}/download\", headers=headers).json())`,
    [baseUrl],
  )

  const jsSnippet = useMemo(
    () => `const API_KEY = 'sk_live_...';\nconst BASE = '${baseUrl}';\nconst headers = { Authorization: 'Bearer ' + API_KEY, 'Content-Type': 'application/json' };\n\nconst job = await fetch(BASE + '/api/v1/generate', {\n  method: 'POST',\n  headers,\n  body: JSON.stringify({ dataset_id: '<dataset-id>', method: 'gaussian_copula' }),\n}).then(r => r.json());\n\nconst status = await fetch(BASE + '/api/v1/generate/' + job.id + '/status', { headers }).then(r => r.json());\nconsole.log(status);\n\nconst download = await fetch(BASE + '/api/v1/synthetic/' + job.id + '/download', { headers }).then(r => r.json());\nconsole.log(download);`,
    [baseUrl],
  )

  const curlSnippet = useMemo(
    () => `curl -X POST '${baseUrl}/api/v1/generate' \\\n  -H 'Authorization: Bearer sk_live_...' \\\n  -H 'Content-Type: application/json' \\\n  -d '{"dataset_id":"<dataset-id>","method":"gaussian_copula"}'\n\ncurl -H 'Authorization: Bearer sk_live_...' '${baseUrl}/api/v1/generate/<synthetic-id>/status'\n\ncurl -H 'Authorization: Bearer sk_live_...' '${baseUrl}/api/v1/synthetic/<synthetic-id>/download'`,
    [baseUrl],
  )

  const fetchKeys = async () => {
    try {
      const { data } = await api.apiKeys.list()
      setKeys(data ?? [])
    } catch (err: any) {
      toast.error('Failed to load API keys', {
        description: err?.response?.data?.detail ?? 'Please refresh and try again.',
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchKeys()
  }, [])

  const handleCreate = async () => {
    if (!name.trim()) {
      toast.error('Name is required')
      return
    }
    if (scopes.length === 0) {
      toast.error('Select at least one scope')
      return
    }

    try {
      const { data } = await api.apiKeys.create({ name: name.trim(), scopes })
      setCreatedKey(data?.key ?? null)
      setDialogOpen(false)
      setName('')
      setScopes(['read', 'generate'])
      await fetchKeys()
    } catch (err: any) {
      toast.error('Unable to create API key', {
        description: err?.response?.data?.detail?.message ?? err?.response?.data?.detail ?? 'Try upgrading plan.',
      })
    }
  }

  const handleRevoke = async (id: string) => {
    if (!window.confirm('Revoke this API key?')) return
    try {
      await api.apiKeys.revoke(id)
      toast.success('API key revoked')
      setKeys((prev) => prev.filter((item) => item.id !== id))
    } catch {
      toast.error('Failed to revoke API key')
    }
  }

  const copyOnceKey = async () => {
    if (!createdKey) return
    await navigator.clipboard.writeText(createdKey)
    toast.success('API key copied')
    setCreatedKey(null)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-text">API Keys</h1>
        <p className="text-sm text-[rgba(241,240,255,0.65)]">Integrate Syntho into your ML pipeline</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Create Key</CardTitle>
          <CardDescription>
            {paidPlan
              ? 'Create and manage API keys for automation workflows.'
              : 'API keys are available on Pro and Growth plans.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {paidPlan ? (
            <Button onClick={() => setDialogOpen(true)}>
              <KeyRound className="mr-2 h-4 w-4" />
              Create New API Key
            </Button>
          ) : (
            <div className="rounded-lg border border-amber-400/30 bg-amber-500/10 p-4 text-sm text-amber-100">
              Upgrade to Pro/Growth to create API keys. <a className="underline" href="/settings/billing">Upgrade now</a>
            </div>
          )}
        </CardContent>
      </Card>

      {createdKey && (
        <Card>
          <CardHeader>
            <CardTitle>Save this key now</CardTitle>
            <CardDescription>We won’t show it again after you close/copy.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="rounded border border-[rgba(167,139,250,0.30)] bg-[rgba(15,15,28,0.85)] p-3 font-mono text-xs break-all">
              {createdKey}
            </div>
            <div className="flex gap-2">
              <Button onClick={copyOnceKey}>
                <Copy className="mr-2 h-4 w-4" />
                Copy Key
              </Button>
              <Button variant="outline" onClick={() => setCreatedKey(null)}>Close</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Keys</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-[rgba(241,240,255,0.65)]">Loading…</p>
          ) : keys.length === 0 ? (
            <p className="text-sm text-[rgba(241,240,255,0.65)]">No API keys yet. Create your first key to start.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="text-left text-[rgba(241,240,255,0.60)]">
                  <tr>
                    <th className="pb-2 pr-4">Name</th>
                    <th className="pb-2 pr-4">Key Prefix</th>
                    <th className="pb-2 pr-4">Scopes</th>
                    <th className="pb-2 pr-4">Usage Count</th>
                    <th className="pb-2 pr-4">Last Used</th>
                    <th className="pb-2 pr-4">Created</th>
                    <th className="pb-2">Revoke</th>
                  </tr>
                </thead>
                <tbody>
                  {keys.map((item) => (
                    <tr key={item.id} className="border-t border-[rgba(167,139,250,0.10)]">
                      <td className="py-2 pr-4">{item.name}</td>
                      <td className="py-2 pr-4 font-mono">{item.key_prefix}</td>
                      <td className="py-2 pr-4">{(item.scopes || []).join(', ')}</td>
                      <td className="py-2 pr-4">{item.usage_count}</td>
                      <td className="py-2 pr-4">{item.last_used_at ? new Date(item.last_used_at).toLocaleString() : 'Never'}</td>
                      <td className="py-2 pr-4">{new Date(item.created_at).toLocaleDateString()}</td>
                      <td className="py-2">
                        <Button size="sm" variant="outline" onClick={() => handleRevoke(item.id)}>
                          <Trash2 className="mr-1 h-3 w-3" />
                          Revoke
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

      <Card>
        <CardHeader>
          <CardTitle>Quick Start Code</CardTitle>
          <CardDescription>Base URL: {baseUrl}</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="python">
            <TabsList>
              <TabsTrigger value="python">Python</TabsTrigger>
              <TabsTrigger value="javascript">JavaScript</TabsTrigger>
              <TabsTrigger value="curl">cURL</TabsTrigger>
            </TabsList>
            <TabsContent value="python"><CodeBlock code={pythonSnippet} /></TabsContent>
            <TabsContent value="javascript"><CodeBlock code={jsSnippet} /></TabsContent>
            <TabsContent value="curl"><CodeBlock code={curlSnippet} /></TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create API Key</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-sm">Name</label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. CI Pipeline" />
            </div>
            <div>
              <p className="mb-2 text-sm">Scopes</p>
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={scopes.includes('generate')}
                    onCheckedChange={(checked) =>
                      setScopes((prev) => checked ? Array.from(new Set([...prev, 'generate'])) : prev.filter((s) => s !== 'generate'))
                    }
                  />
                  generate
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={scopes.includes('read')}
                    onCheckedChange={(checked) =>
                      setScopes((prev) => checked ? Array.from(new Set([...prev, 'read'])) : prev.filter((s) => s !== 'read'))
                    }
                  />
                  read
                </label>
              </div>
            </div>
            <Button className="w-full" onClick={handleCreate}>Create Key</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function CodeBlock({ code }: { code: string }) {
  return (
    <pre className="mt-3 overflow-x-auto rounded-lg border border-[rgba(167,139,250,0.15)] bg-[rgba(15,15,28,0.75)] p-4 text-xs text-[rgba(241,240,255,0.80)]">
      <code>{code}</code>
    </pre>
  )
}
