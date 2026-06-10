import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MessageSquare, Mail, Phone, Send } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Loader2, Activity, ShieldAlert, CheckCircle2 } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";

export function TenantCommunicationCard() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: tenant, isLoading } = useQuery<any>({
    queryKey: ["/api/me/tenant"],
  });

  // SMS Settings
  const [smsProvider, setSmsProvider] = useState("mock");
  const [smsAccountSid, setSmsAccountSid] = useState("");
  const [smsAuthToken, setSmsAuthToken] = useState("");
  const [smsSenderNumber, setSmsSenderNumber] = useState("");

  // WhatsApp Settings
  const [waProvider, setWaProvider] = useState("mock");
  const [waAccountSid, setWaAccountSid] = useState("");
  const [waAuthToken, setWaAuthToken] = useState("");
  const [waSenderNumber, setWaSenderNumber] = useState("");

  // Email Settings
  const [emailHost, setEmailHost] = useState("");
  const [emailPort, setEmailPort] = useState("");
  const [emailUser, setEmailUser] = useState("");
  const [emailPass, setEmailPass] = useState("");
  const [emailFrom, setEmailFrom] = useState("");

  // Test states
  const [testEmailTo, setTestEmailTo] = useState("");
  const [testSmsTo, setTestSmsTo] = useState("");
  const [testWaTo, setTestWaTo] = useState("");
  const [testingChannel, setTestingChannel] = useState<string | null>(null);

  // Innovation: Smart Routing
  const [smartRouting, setSmartRouting] = useState(false);

  const { data: logs = [], refetch: refetchLogs } = useQuery<any[]>({
    queryKey: ["/api/me/tenant/communication-logs"],
  });

  useEffect(() => {
    if (tenant?.settings?.communication) {
      const comm = tenant.settings.communication;
      if (comm.sms) {
        setSmsProvider(comm.sms.provider || "mock");
        setSmsAccountSid(comm.sms.accountSid || "");
        setSmsAuthToken(comm.sms.authToken || "");
        setSmsSenderNumber(comm.sms.senderNumber || "");
      }
      if (comm.whatsapp) {
        setWaProvider(comm.whatsapp.provider || "mock");
        setWaAccountSid(comm.whatsapp.accountSid || "");
        setWaAuthToken(comm.whatsapp.authToken || "");
        setWaSenderNumber(comm.whatsapp.senderNumber || "");
      }
      if (comm.email) {
        setEmailHost(comm.email.host || "");
        setEmailPort(String(comm.email.port || ""));
        setEmailUser(comm.email.user || "");
        setEmailPass(comm.email.pass || "");
        setEmailFrom(comm.email.from || "");
      }
      setSmartRouting(comm.smartRouting === true);
    }
  }, [tenant]);

  const mutation = useMutation({
    mutationFn: async (updatedSettings: any) =>
      apiRequest("PATCH", "/api/me/tenant", { settings: updatedSettings }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/me/tenant"] });
      toast({
        title: "Communication Settings Saved",
        description: "Outgoing notifications will now use these credentials.",
      });
    },
    onError: (err: Error) => {
      toast({
        title: "Failed to save settings",
        description: err.message,
        variant: "destructive",
      });
    },
  });

  const onSave = () => {
    const existingSettings = tenant?.settings || {};
    const updatedSettings = {
      ...existingSettings,
      communication: {
        ...existingSettings.communication,
        sms: {
          provider: smsProvider,
          accountSid: smsAccountSid,
          authToken: smsAuthToken,
          senderNumber: smsSenderNumber,
        },
        whatsapp: {
          provider: waProvider,
          accountSid: waAccountSid,
          authToken: waAuthToken,
          senderNumber: waSenderNumber,
        },
        email: {
          host: emailHost,
          port: emailPort ? Number(emailPort) : undefined,
          user: emailUser,
          pass: emailPass,
          from: emailFrom,
        },
        smartRouting,
      },
    };
    mutation.mutate(updatedSettings);
  };

  const handleTest = async (channel: 'email' | 'sms' | 'whatsapp') => {
    let destination = "";
    if (channel === 'email') destination = testEmailTo;
    if (channel === 'sms') destination = testSmsTo;
    if (channel === 'whatsapp') destination = testWaTo;

    if (!destination) {
      toast({ title: "Destination Required", description: "Please enter a test destination.", variant: "destructive" });
      return;
    }

    setTestingChannel(channel);
    try {
      const data: any = await apiRequest("POST", "/api/me/tenant/test-communication", { channel, destination });
      toast({
        title: "Test Message Dispatched",
        description: data.message || "Message successfully sent to gateway.",
      });
    } catch (err: any) {
      toast({
        title: "Test Failed",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setTestingChannel(null);
      refetchLogs();
    }
  };

  return (
    <Card data-testid="card-tenant-communication">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
            <MessageSquare className="h-5 w-5 text-primary" />
          </div>
          <div>
            <CardTitle className="text-lg">Communication Integrations</CardTitle>
            <CardDescription>
              Configure providers for SMS, WhatsApp, and Email dispatch.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">

        {/* Smart Routing Callout */}
        <div className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 p-4 rounded-xl flex items-start gap-4">
          <Activity className="w-5 h-5 text-indigo-600 dark:text-indigo-400 mt-1" />
          <div className="flex-1 space-y-1">
            <h4 className="font-semibold text-sm text-indigo-900 dark:text-indigo-300">Intelligent Omnichannel Routing</h4>
            <p className="text-xs text-indigo-800/80 dark:text-indigo-400/80">
              When enabled, the Unified Communication Engine will automatically failover from WhatsApp &rarr; SMS &rarr; Email if a provider fails or the recipient isn't registered on the channel.
            </p>
          </div>
          <Switch checked={smartRouting} onCheckedChange={setSmartRouting} disabled={isLoading} />
        </div>
        
        {/* Email Section */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold flex items-center gap-2"><Mail className="w-4 h-4" /> Email (SMTP)</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs">SMTP Host</Label>
              <Input placeholder="smtp.gmail.com" value={emailHost} onChange={e => setEmailHost(e.target.value)} disabled={isLoading} />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">SMTP Port</Label>
              <Input placeholder="465" value={emailPort} onChange={e => setEmailPort(e.target.value)} disabled={isLoading} />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">SMTP User (Email)</Label>
              <Input placeholder="user@example.com" value={emailUser} onChange={e => setEmailUser(e.target.value)} disabled={isLoading} />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">SMTP Password / App Password</Label>
              <Input type="password" placeholder="••••••••" value={emailPass} onChange={e => setEmailPass(e.target.value)} disabled={isLoading} />
            </div>
            <div className="col-span-2 space-y-2">
              <Label className="text-xs">From Header</Label>
              <Input placeholder="&quot;VaxPlan Notifications&quot; <no-reply@example.com>" value={emailFrom} onChange={e => setEmailFrom(e.target.value)} disabled={isLoading} />
            </div>
          </div>
          
          <div className="flex items-end gap-2 mt-2 bg-muted/30 p-3 rounded-lg border border-border/50">
            <div className="space-y-1.5 flex-1">
              <Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Test Destination</Label>
              <Input placeholder="Enter test email address" value={testEmailTo} onChange={e => setTestEmailTo(e.target.value)} disabled={isLoading || testingChannel !== null} />
            </div>
            <Button type="button" variant="secondary" onClick={() => handleTest('email')} disabled={isLoading || testingChannel !== null}>
              {testingChannel === 'email' ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
              Send Test
            </Button>
          </div>
        </div>

        <Separator />

        {/* SMS Section */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold flex items-center gap-2"><Phone className="w-4 h-4" /> SMS Provider</h3>
          <div className="space-y-2">
            <Label className="text-xs">Provider</Label>
            <Select value={smsProvider} onValueChange={setSmsProvider} disabled={isLoading}>
              <SelectTrigger><SelectValue placeholder="Select provider" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="mock">Mock / Console Logs</SelectItem>
                <SelectItem value="redis">Redis Pub/Sub (External Worker)</SelectItem>
                <SelectItem value="twilio">Twilio</SelectItem>
                <SelectItem value="africastalking">Africa's Talking</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {smsProvider !== "mock" && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs">Account SID / API Key</Label>
                <Input value={smsAccountSid} onChange={e => setSmsAccountSid(e.target.value)} disabled={isLoading} />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Auth Token / Username</Label>
                <Input type="password" value={smsAuthToken} onChange={e => setSmsAuthToken(e.target.value)} disabled={isLoading} />
              </div>
              <div className="col-span-2 space-y-2">
                <Label className="text-xs">Sender Number / ID</Label>
                <Input placeholder="+1234567890" value={smsSenderNumber} onChange={e => setSmsSenderNumber(e.target.value)} disabled={isLoading} />
              </div>
            </div>
          )}
          
          <div className="flex items-end gap-2 mt-2 bg-muted/30 p-3 rounded-lg border border-border/50">
            <div className="space-y-1.5 flex-1">
              <Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Test Destination</Label>
              <Input placeholder="Enter test phone number (e.g. +260...)" value={testSmsTo} onChange={e => setTestSmsTo(e.target.value)} disabled={isLoading || testingChannel !== null} />
            </div>
            <Button type="button" variant="secondary" onClick={() => handleTest('sms')} disabled={isLoading || testingChannel !== null}>
              {testingChannel === 'sms' ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
              Send Test
            </Button>
          </div>
        </div>

        <Separator />

        {/* WhatsApp Section */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold flex items-center gap-2"><MessageSquare className="w-4 h-4" /> WhatsApp Provider</h3>
          <div className="space-y-2">
            <Label className="text-xs">Provider</Label>
            <Select value={waProvider} onValueChange={setWaProvider} disabled={isLoading}>
              <SelectTrigger><SelectValue placeholder="Select provider" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="mock">Mock / Console Logs</SelectItem>
                <SelectItem value="redis">Redis Pub/Sub (External Worker)</SelectItem>
                <SelectItem value="twilio">Twilio WhatsApp</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {waProvider !== "mock" && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs">Account SID</Label>
                <Input value={waAccountSid} onChange={e => setWaAccountSid(e.target.value)} disabled={isLoading} />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Auth Token</Label>
                <Input type="password" value={waAuthToken} onChange={e => setWaAuthToken(e.target.value)} disabled={isLoading} />
              </div>
              <div className="col-span-2 space-y-2">
                <Label className="text-xs">Sender Number (without whatsapp: prefix)</Label>
                <Input placeholder="+1234567890" value={waSenderNumber} onChange={e => setWaSenderNumber(e.target.value)} disabled={isLoading} />
              </div>
            </div>
          )}

          <div className="flex items-end gap-2 mt-2 bg-muted/30 p-3 rounded-lg border border-border/50">
            <div className="space-y-1.5 flex-1">
              <Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Test Destination</Label>
              <Input placeholder="Enter test WhatsApp number (e.g. +260...)" value={testWaTo} onChange={e => setTestWaTo(e.target.value)} disabled={isLoading || testingChannel !== null} />
            </div>
            <Button type="button" variant="secondary" onClick={() => handleTest('whatsapp')} disabled={isLoading || testingChannel !== null}>
              {testingChannel === 'whatsapp' ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
              Send Test
            </Button>
          </div>
        </div>

        <div className="flex justify-end pt-4">
          <Button onClick={onSave} disabled={mutation.isPending}>
            {mutation.isPending ? "Saving..." : "Save Integrations"}
          </Button>
        </div>

        <Separator className="my-6" />

        {/* Dispatch History Logs */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <Activity className="w-4 h-4" /> Recent Dispatches
          </h3>
          <div className="rounded-md border max-h-[300px] overflow-y-auto">
            <Table>
              <TableHeader className="bg-muted/50 sticky top-0">
                <TableRow>
                  <TableHead className="w-[140px]">Time</TableHead>
                  <TableHead>Channel</TableHead>
                  <TableHead>Destination</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground h-24">
                      No communications dispatched yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  logs.map((log: any) => (
                    <TableRow key={log.id}>
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                        {format(new Date(log.createdAt), "PP HH:mm")}
                      </TableCell>
                      <TableCell>
                        <span className="capitalize text-xs font-medium px-2 py-0.5 rounded-full bg-secondary/50">
                          {log.channel}
                        </span>
                        {log.fallbackTriggered && (
                          <span className="ml-2 text-[10px] text-amber-600 bg-amber-100 dark:bg-amber-900/30 px-1.5 py-0.5 rounded">Fallback</span>
                        )}
                      </TableCell>
                      <TableCell className="font-medium text-xs">{log.destination}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          {log.status === 'delivered' ? (
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                          ) : (
                            <ShieldAlert className="w-3.5 h-3.5 text-rose-500" />
                          )}
                          <span className="text-xs capitalize">{log.status}</span>
                        </div>
                        {log.status === 'failed' && log.providerResponse && (
                          <p className="text-[10px] text-muted-foreground mt-0.5 max-w-[200px] truncate" title={log.providerResponse}>
                            {log.providerResponse}
                          </p>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
