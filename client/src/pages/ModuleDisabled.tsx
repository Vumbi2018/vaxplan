import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ShieldAlert, Home, ArrowLeft } from "lucide-react";
import { Link } from "wouter";

interface ModuleDisabledProps {
  moduleName?: string;
}

export default function ModuleDisabled({ moduleName = "Requested Module" }: ModuleDisabledProps) {
  return (
    <div className="min-h-[80vh] w-full flex items-center justify-center p-4 bg-gradient-to-br from-slate-50/50 via-slate-100/30 to-slate-50/50 dark:from-slate-950/50 dark:via-slate-900/30 dark:to-slate-950/50">
      <Card className="w-full max-w-lg border border-border/60 shadow-2xl backdrop-blur-md bg-card/75 dark:bg-card/45 rounded-3xl overflow-hidden relative group transition-all duration-500 hover:shadow-indigo-500/5 hover:border-indigo-500/20">
        
        {/* Glow effect */}
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-indigo-500/10 dark:indigo-500/5 rounded-full blur-3xl group-hover:bg-indigo-500/15 transition-all duration-500" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-sky-500/10 dark:sky-500/5 rounded-full blur-3xl group-hover:bg-sky-500/15 transition-all duration-500" />

        <CardHeader className="pt-8 pb-4 text-center relative z-10">
          <div className="mx-auto h-16 w-16 rounded-2xl bg-gradient-to-tr from-amber-500/20 to-rose-500/20 dark:from-amber-500/10 dark:to-rose-500/10 border border-amber-500/30 dark:border-amber-500/20 flex items-center justify-center mb-4 shadow-lg shadow-amber-500/10 group-hover:scale-110 transition-all duration-500">
            <ShieldAlert className="h-8 w-8 text-amber-600 dark:text-amber-500" />
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 dark:from-slate-50 dark:via-indigo-100 dark:to-slate-50 bg-clip-text text-transparent">
            Module Deactivated
          </CardTitle>
          <CardDescription className="text-sm font-semibold text-indigo-600 dark:text-indigo-400 mt-1 uppercase tracking-wider">
            {moduleName}
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6 text-center relative z-10 pb-8 px-6 sm:px-8">
          <p className="text-sm text-muted-foreground leading-relaxed">
            This operational module is currently disabled for this country tenant by the National Ministry Administrator. 
            Features, map overlays, and databases related to this function have been hidden.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
            <Button asChild variant="outline" className="rounded-xl font-semibold border-border/80 hover:bg-accent flex items-center gap-2">
              <Link href="/">
                <Home className="h-4 w-4" />
                <span>Go to Dashboard</span>
              </Link>
            </Button>
            <Button asChild className="bg-gradient-to-r from-indigo-600 to-sky-600 hover:from-indigo-700 hover:to-sky-700 text-white rounded-xl font-semibold shadow-md flex items-center gap-2">
              <Link href="/settings?tab=access">
                <ArrowLeft className="h-4 w-4" />
                <span>Configure Settings</span>
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
