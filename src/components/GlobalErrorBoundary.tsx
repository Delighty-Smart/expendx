import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { AlertCircle, RefreshCw } from 'lucide-react';

interface Props {
    children: ReactNode;
    fallback?: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

export class GlobalErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
        error: null,
    };

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error('Uncaught error:', error, errorInfo);
    }

    private handleReset = () => {
        this.setState({ hasError: false, error: null });
        window.location.href = '/dashboard';
    };

    public render() {
        if (this.state.hasError) {
            if (this.props.fallback) {
                return this.props.fallback;
            }

            return (
                <div className="min-h-screen w-full flex flex-col items-center justify-center p-6 bg-background text-foreground">
                    <div className="max-w-md w-full space-y-6 text-center animate-in fade-in zoom-in duration-300">
                        <div className="flex justify-center">
                            <div className="p-4 rounded-full bg-destructive/10">
                                <AlertCircle className="w-12 h-12 text-destructive" />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <h1 className="text-2xl font-bold tracking-tight">Something went wrong</h1>
                            <p className="text-muted-foreground">
                                The application encountered an unexpected error and needs to restart.
                            </p>
                        </div>

                        {process.env.NODE_ENV === 'development' && this.state.error && (
                            <div className="p-4 rounded-lg bg-muted text-left overflow-auto max-h-48 text-xs font-mono">
                                {this.state.error.toString()}
                            </div>
                        )}

                        <div className="pt-4">
                            <Button
                                onClick={this.handleReset}
                                className="w-full flex items-center justify-center gap-2"
                            >
                                <RefreshCw className="w-4 h-4" />
                                Restart Application
                            </Button>
                        </div>

                        <p className="text-xs text-muted-foreground pt-4">
                            If the problem persists, please contact support or try clearing your app cache.
                        </p>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}
