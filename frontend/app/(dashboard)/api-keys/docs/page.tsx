'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Copy, Check, Play, ChevronDown, ChevronRight, ExternalLink } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { api } from '@/lib/api';
import { toast } from 'sonner';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://your-app.onrender.com/api/v1';

const ENDPOINTS = [
  {
    method: 'POST',
    path: '/api/v1/ext/datasets',
    name: 'Upload Dataset',
    description: 'Upload a dataset file for synthetic data generation',
    auth: 'API Key (generate scope)',
    body: {
      file: 'multipart/form-data',
      name: 'string (required)',
      description: 'string (optional)',
    },
    response: {
      dataset_id: 'uuid',
      name: 'string',
      row_count: 'number',
      column_count: 'number',
      schema: 'object',
    },
  },
  {
    method: 'GET',
    path: '/api/v1/ext/datasets',
    name: 'List Datasets',
    description: 'List all datasets for the authenticated user',
    auth: 'API Key',
    query: {
      page: 'number (default: 1)',
      per_page: 'number (default: 20, max: 100)',
    },
    response: {
      datasets: 'array',
      total: 'number',
      page: 'number',
      per_page: 'number',
    },
  },
  {
    method: 'GET',
    path: '/api/v1/ext/datasets/{id}',
    name: 'Get Dataset',
    description: 'Get a single dataset by ID with full schema',
    auth: 'API Key',
    response: {
      id: 'uuid',
      name: 'string',
      schema: 'object',
      row_count: 'number',
      column_count: 'number',
    },
  },
  {
    method: 'POST',
    path: '/api/v1/ext/generate',
    name: 'Create Generation Job',
    description: 'Start a synthetic data generation job',
    auth: 'API Key (generate scope)',
    body: {
      dataset_id: 'uuid (required)',
      method: '"ctgan" | "gaussian_copula" | "tvae"',
      config: {
        num_rows: 'number (optional)',
        epochs: 'number (optional)',
      },
    },
    response: {
      job_id: 'string',
      synthetic_dataset_id: 'uuid',
      status: 'string',
    },
  },
  {
    method: 'GET',
    path: '/api/v1/ext/generate/{id}/status',
    name: 'Get Generation Status',
    description: 'Get the status of a generation job',
    auth: 'API Key',
    response: {
      synthetic_dataset_id: 'uuid',
      status: '"pending" | "running" | "completed" | "failed"',
      progress: 'number (0-100)',
      estimated_minutes_remaining: 'number (optional)',
    },
  },
  {
    method: 'GET',
    path: '/api/v1/ext/results/{id}',
    name: 'Get Results',
    description: 'Get all results for a synthetic dataset',
    auth: 'API Key',
    response: {
      synthetic_dataset_id: 'uuid',
      privacy_score: 'number (optional)',
      quality_score: 'number (optional)',
      compliance_passed: 'boolean (optional)',
      download_url: 'string (optional)',
    },
  },
  {
    method: 'GET',
    path: '/api/v1/ext/results/{id}/download',
    name: 'Download Results',
    description: 'Redirect to signed download URL',
    auth: 'API Key',
    response: '302 Redirect to signed URL',
  },
];

const ERROR_CODES = [
  { code: 'DATASET_NOT_FOUND', message: 'The requested dataset was not found' },
  { code: 'GENERATION_NOT_FOUND', message: 'The generation job was not found' },
  { code: 'INVALID_FILE_TYPE', message: 'File type not supported' },
  { code: 'FILE_TOO_LARGE', message: 'File exceeds maximum size limit' },
  { code: 'RATE_LIMIT_EXCEEDED', message: 'Too many requests' },
  { code: 'UNAUTHORIZED', message: 'Invalid or missing API key' },
  { code: 'FORBIDDEN', message: 'API key lacks required scope' },
];

const PYTHON_SNIPPETS: Record<string, string> = {
  upload: `import requests

API_KEY = "sk_live_your_key"
BASE_URL = "${API_BASE_URL}"
headers = {
    "Authorization": f"Bearer {API_KEY}",
}

# Upload a dataset
with open("data.csv", "rb") as f:
    files = {"file": f}
    data = {"name": "My Dataset"}
    response = requests.post(
        f"{BASE_URL}/ext/datasets",
        headers=headers,
        files=files,
        data=data
    )
print(response.json())`,
  
  list: `import requests

API_KEY = "sk_live_your_key"
BASE_URL = "${API_BASE_URL}"
headers = {"Authorization": f"Bearer {API_KEY}"}

# List datasets
response = requests.get(
    f"{BASE_URL}/ext/datasets?page=1&per_page=20",
    headers=headers
)
print(response.json())`,
  
  generate: `import requests
import time

API_KEY = "sk_live_your_key"
BASE_URL = "${API_BASE_URL}"
headers = {
    "Authorization": f"Bearer {API_KEY}",
    "Content-Type": "application/json"
}

# Start generation
payload = {
    "dataset_id": "dataset-uuid",
    "method": "gaussian_copula",
    "config": {"num_rows": 1000}
}
response = requests.post(
    f"{BASE_URL}/ext/generate",
    headers=headers,
    json=payload
)
job = response.json()
print(f"Job ID: {job['job_id']}")

# Poll for status
while True:
    status_resp = requests.get(
        f"{BASE_URL}/ext/generate/{job['synthetic_dataset_id']}/status",
        headers=headers
    )
    status = status_resp.json()
    print(f"Status: {status['status']}, Progress: {status['progress']}%")
    if status["status"] in ["completed", "failed"]:
        break
    time.sleep(5)`,
  
  results: `import requests

API_KEY = "sk_live_your_key"
BASE_URL = "${API_BASE_URL}"
headers = {"Authorization": f"Bearer {API_KEY}"}

# Get results
response = requests.get(
    f"{BASE_URL}/ext/results/synthetic-dataset-id",
    headers=headers
)
print(response.json())

# Download (follows redirect)
download_resp = requests.get(
    f"{BASE_URL}/ext/results/synthetic-dataset-id/download",
    headers=headers,
    allow_redirects=False
)
signed_url = download_resp.headers["Location"]
print(f"Download URL: {signed_url}")`,
};

const JAVASCRIPT_SNIPPETS: Record<string, string> = {
  upload: `const API_KEY = "sk_live_your_key";
const BASE_URL = "${API_BASE_URL}";

const formData = new FormData();
formData.append("file", datasetFile);
formData.append("name", "My Dataset");

const response = await fetch(\`\${BASE_URL}/ext/datasets\`, {
    method: "POST",
    headers: {
        "Authorization": \`Bearer \${API_KEY}\`,
    },
    body: formData,
});
const data = await response.json();
console.log(data);`,
  
  list: `const API_KEY = "sk_live_your_key";
const BASE_URL = "${API_BASE_URL}";

const response = await fetch(
    \`\${BASE_URL}/ext/datasets?page=1&per_page=20\`,
    {
        headers: {
            "Authorization": \`Bearer \${API_KEY}\`,
        },
    }
);
const data = await response.json();
console.log(data);`,
  
  generate: `const API_KEY = "sk_live_your_key";
const BASE_URL = "${API_BASE_URL}";

const response = await fetch(\`\${BASE_URL}/ext/generate\`, {
    method: "POST",
    headers: {
        "Authorization": \`Bearer \${API_KEY}\`,
        "Content-Type": "application/json",
    },
    body: JSON.stringify({
        dataset_id: "dataset-uuid",
        method: "gaussian_copula",
        config: { num_rows: 1000 },
    }),
});
const job = await response.json();
console.log("Job ID:", job.job_id);

// Poll for status
let status;
do {
    await new Promise(r => setTimeout(r, 5000));
    const statusResp = await fetch(
        \`\${BASE_URL}/ext/generate/\${job.synthetic_dataset_id}/status\`,
        { headers: { "Authorization": \`Bearer \${API_KEY}\` } }
    );
    status = await statusResp.json();
    console.log(\`Status: \${status.status}, Progress: \${status.progress}%\`);
} while (status.status === "running");`,
  
  results: `const API_KEY = "sk_live_your_key";
const BASE_URL = "${API_BASE_URL}";

// Get results
const response = await fetch(
    \`\${BASE_URL}/ext/results/synthetic-dataset-id\`,
    {
        headers: {
            "Authorization": \`Bearer \${API_KEY}\`,
        },
    }
);
const data = await response.json();
console.log(data);

// Download (follows redirect)
const downloadResp = await fetch(
    \`\${BASE_URL}/ext/results/synthetic-dataset-id/download\`,
    {
        headers: {
            "Authorization": \`Bearer \${API_KEY}\`,
        },
        redirect: "manual",
    }
);
const signedUrl = downloadResp.headers.get("location");
console.log("Download URL:", signedUrl);`,
};

const CURL_SNIPPETS: Record<string, string> = {
  upload: `curl -X POST "${API_BASE_URL}/ext/datasets" \\
  -H "Authorization: Bearer sk_live_your_key" \\
  -F "file=@data.csv" \\
  -F "name=My Dataset"`,
  
  list: `curl "${API_BASE_URL}/ext/datasets?page=1&per_page=20" \\
  -H "Authorization: Bearer sk_live_your_key"`,
  
  generate: `curl -X POST "${API_BASE_URL}/ext/generate" \\
  -H "Authorization: Bearer sk_live_your_key" \\
  -H "Content-Type: application/json" \\
  -d '{
    "dataset_id": "dataset-uuid",
    "method": "gaussian_copula",
    "config": {"num_rows": 1000}
  }'`,
  
  results: `curl "${API_BASE_URL}/ext/results/synthetic-dataset-id" \\
  -H "Authorization: Bearer sk_live_your_key"`,
};

function CodeBlock({ code, label }: { code: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative rounded-lg bg-[rgba(0,0,0,0.4)] overflow-hidden">
      {label && (
        <div className="flex items-center justify-between px-4 py-2 bg-[rgba(167,139,250,0.1)] border-b border-[rgba(167,139,250,0.1)]">
          <span className="text-xs font-medium text-[rgba(241,240,255,0.65)]">{label}</span>
        </div>
      )}
      <pre className="p-4 text-xs text-[rgba(241,240,255,0.87)] overflow-x-auto">
        <code>{code}</code>
      </pre>
      <Button
        variant="ghost"
        size="icon"
        className="absolute top-2 right-2"
        onClick={handleCopy}
      >
        {copied ? <Check className="h-4 w-4 text-green-400" /> : <Copy className="h-4 w-4" />}
      </Button>
    </div>
  );
}

function EndpointCard({ endpoint }: { endpoint: typeof ENDPOINTS[0] }) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('python');

  const methodColors: Record<string, string> = {
    GET: 'text-blue-400 bg-blue-400/10',
    POST: 'text-green-400 bg-green-400/10',
    PUT: 'text-yellow-400 bg-yellow-400/10',
    DELETE: 'text-red-400 bg-red-400/10',
  };

  const getSnippetKey = () => {
    if (endpoint.path.includes('datasets') && endpoint.method === 'POST') return 'upload';
    if (endpoint.path.includes('datasets') && endpoint.method === 'GET' && !endpoint.path.includes('{')) return 'list';
    if (endpoint.path.includes('generate')) return 'generate';
    if (endpoint.path.includes('results')) return 'results';
    return 'list';
  };

  return (
    <Card className="overflow-hidden">
      <button
        className="w-full flex items-center gap-3 p-4 text-left hover:bg-[rgba(255,255,255,0.02)] transition-colors"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className={`px-2 py-0.5 rounded text-xs font-mono font-medium ${methodColors[endpoint.method]}`}>
          {endpoint.method}
        </span>
        <code className="flex-1 text-sm text-[rgba(241,240,255,0.87)]">{endpoint.path}</code>
        <span className="text-[rgba(241,240,255,0.38)]">
          {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </span>
      </button>

      {isOpen && (
        <div className="border-t border-[rgba(167,139,250,0.10)]">
          <div className="p-4">
            <p className="text-sm text-[rgba(241,240,255,0.65)] mb-4">{endpoint.description}</p>

            <div className="grid gap-4 sm:grid-cols-2 mb-4">
              <div>
                <h4 className="text-xs font-medium text-[rgba(241,240,255,0.38)] mb-2">Authentication</h4>
                <code className="text-xs text-primary">{endpoint.auth}</code>
              </div>
              {endpoint.body && (
                <div>
                  <h4 className="text-xs font-medium text-[rgba(241,240,255,0.38)] mb-2">Request Body</h4>
                  <div className="space-y-1">
                    {Object.entries(endpoint.body).map(([key, value]) => (
                      <div key={key} className="flex gap-2 text-xs">
                        <code className="text-primary">{key}</code>
                        <span className="text-[rgba(241,240,255,0.38)]">: {typeof value === 'object' ? JSON.stringify(value) : value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="python">Python</TabsTrigger>
                <TabsTrigger value="javascript">JavaScript</TabsTrigger>
                <TabsTrigger value="curl">cURL</TabsTrigger>
              </TabsList>

              <TabsContent value="python" className="mt-3">
                <CodeBlock code={PYTHON_SNIPPETS[getSnippetKey()]} label="Python" />
              </TabsContent>
              <TabsContent value="javascript" className="mt-3">
                <CodeBlock code={JAVASCRIPT_SNIPPETS[getSnippetKey()]} label="JavaScript" />
              </TabsContent>
              <TabsContent value="curl" className="mt-3">
                <CodeBlock code={CURL_SNIPPETS[getSnippetKey()]} label="cURL" />
              </TabsContent>
            </Tabs>
          </div>
        </div>
      )}
    </Card>
  );
}

export default function ApiDocsPage() {
  const { data: keys } = useQuery({
    queryKey: ['api-keys'],
    queryFn: async () => {
      const response = await api.apiKeys.list();
      return response.data;
    },
  });

  const hasApiKey = keys && keys.length > 0;
  const activeKey = keys?.[0]?.key_prefix + '...';

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="font-display text-2xl font-bold text-text">API Documentation</h1>
        <p className="text-sm text-[rgba(241,240,255,0.65)]">
          Complete reference for the Syntho REST API
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Authentication</CardTitle>
          <CardDescription>
            All API requests require authentication using an API key
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg border border-[rgba(167,139,250,0.10)] bg-[rgba(255,255,255,0.04)] p-4">
            <h4 className="text-sm font-medium mb-2">Authorization Header</h4>
            <code className="text-sm text-primary">Authorization: Bearer sk_live_your_key_here</code>
          </div>

          <div className="rounded-lg bg-[rgba(6,182,212,0.10)] p-4 text-sm text-cyan-400">
            <p className="font-medium">Rate Limits</p>
            <ul className="mt-2 space-y-1 text-xs text-[rgba(241,240,255,0.65)]">
              <li>• 60 requests per minute</li>
              <li>• 1000 requests per day</li>
              <li>• Returns 429 with Retry-After when exceeded</li>
            </ul>
          </div>

          {hasApiKey ? (
            <div className="rounded-lg bg-[rgba(34,197,94,0.10)] border border-[rgba(34,197,94,0.20)] p-4">
              <div className="flex items-center gap-2 text-green-400">
                <Check className="h-4 w-4" />
                <span className="text-sm font-medium">API Key Active</span>
              </div>
              <p className="text-xs text-[rgba(241,240,255,0.65)] mt-1">
                Your active key: <code className="text-primary">{activeKey}</code>
              </p>
            </div>
          ) : (
            <div className="rounded-lg bg-[rgba(251,191,36,0.10)] border border-[rgba(251,191,36,0.20)] p-4">
              <div className="flex items-center gap-2 text-yellow-400">
                <Play className="h-4 w-4" />
                <span className="text-sm font-medium">Create an API Key</span>
              </div>
              <p className="text-xs text-[rgba(241,240,255,0.65)] mt-1">
                You need an API key to use the external API. Create one in the API Keys section.
              </p>
              <Button variant="link" asChild className="mt-2 text-primary h-auto p-0">
                <a href="/api-keys">Go to API Keys</a>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Endpoints</CardTitle>
          <CardDescription>
            All endpoints are prefixed with <code className="text-primary">{API_BASE_URL}</code>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {ENDPOINTS.map((endpoint) => (
            <EndpointCard key={endpoint.path} endpoint={endpoint} />
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Error Codes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2">
            {ERROR_CODES.map((error) => (
              <div
                key={error.code}
                className="rounded-lg border border-[rgba(167,139,250,0.10)] p-3"
              >
                <div className="flex items-center justify-between mb-1">
                  <code className="text-xs font-mono text-red-400">{error.code}</code>
                </div>
                <p className="text-xs text-[rgba(241,240,255,0.65)]">{error.message}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-center">
        <Button variant="outline" asChild>
          <a href="/api-reference" className="flex items-center gap-2">
            View Full API Reference
            <ExternalLink className="h-4 w-4" />
          </a>
        </Button>
      </div>
    </div>
  );
}