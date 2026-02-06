import React, { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Alert, AlertDescription } from './ui/alert';
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { projectId, publicAnonKey } from '../../../utils/supabase/info';

export function AdminSetup() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  const assignSuperAdmin = async () => {
    setLoading(true);
    setResult(null);

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-06086aa3/admin/assign-super-admin`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${publicAnonKey}`,
          },
          body: JSON.stringify({ email }),
        }
      );

      const data = await response.json();

      if (response.ok) {
        setResult({
          success: true,
          message: `✅ ${data.message}\n\nUser: ${data.user.email}\nRole: ${data.user.role}`,
        });
      } else {
        setResult({
          success: false,
          message: data.error || 'Failed to assign super admin role',
        });
      }
    } catch (error: any) {
      setResult({
        success: false,
        message: `Error: ${error.message}`,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto mt-8">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          🔐 Admin Setup
        </CardTitle>
        <CardDescription>
          Assign super_admin role to a user by email
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <label htmlFor="email" className="text-sm font-medium">
            Email Address
          </label>
          <Input
            id="email"
            type="email"
            placeholder="user@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={loading}
          />
          <p className="text-xs text-muted-foreground">
            Note: User must be signed up first before assigning admin role
          </p>
        </div>

        <Button
          onClick={assignSuperAdmin}
          disabled={loading || !email}
          className="w-full"
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Assigning...
            </>
          ) : (
            <>Assign Super Admin Role</>
          )}
        </Button>

        {result && (
          <Alert variant={result.success ? 'default' : 'destructive'}>
            {result.success ? (
              <CheckCircle2 className="h-4 w-4" />
            ) : (
              <XCircle className="h-4 w-4" />
            )}
            <AlertDescription className="whitespace-pre-line">
              {result.message}
            </AlertDescription>
          </Alert>
        )}

        <div className="pt-4 border-t text-sm text-muted-foreground">
          <p className="font-medium mb-2">Setup Instructions:</p>
          <ol className="list-decimal list-inside space-y-1 text-xs">
            <li>Make sure the user has signed up first</li>
            <li>Enter their email address above</li>
            <li>Click "Assign Super Admin Role"</li>
            <li>User can now log in with full admin access</li>
          </ol>
        </div>
      </CardContent>
    </Card>
  );
}