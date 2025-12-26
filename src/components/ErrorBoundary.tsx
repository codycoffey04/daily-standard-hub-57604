import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle } from 'lucide-react';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  componentStack: string | null;
  showDetails: boolean;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      componentStack: null,
      showDetails: false,
    };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    // Update state so the next render will show the fallback UI
    return {
      hasError: true,
      error,
      componentStack: null,
      showDetails: false,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Log error details to console
    console.error('ErrorBoundary caught an error:', error);
    console.error('Error details:', errorInfo);
    console.error('Component stack:', errorInfo.componentStack);

    this.setState({ componentStack: errorInfo.componentStack ?? null });
  }

  handleReload = (): void => {
    // Reset error state and reload the page
    this.setState({ hasError: false, error: null, componentStack: null, showDetails: false });
    window.location.reload();
  };

  render(): ReactNode {
    if (this.state.hasError) {
      const stack = this.state.error?.stack;

      return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-background">
          <Card className="max-w-2xl w-full">
            <CardHeader>
              <div className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-destructive" />
                <CardTitle>Something went wrong</CardTitle>
              </div>
              <CardDescription>
                The application encountered an unexpected error. Please try reloading the page.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {this.state.error && (
                <div className="p-3 bg-muted rounded-md">
                  <p className="text-sm font-mono text-muted-foreground break-words">
                    {this.state.error.message}
                  </p>
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-2">
                <Button onClick={this.handleReload} className="w-full">
                  Reload Page
                </Button>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => this.setState(prev => ({ ...prev, showDetails: !prev.showDetails }))}
                >
                  {this.state.showDetails ? 'Hide details' : 'Show details'}
                </Button>
              </div>

              {this.state.showDetails && (
                <div className="space-y-3">
                  {stack && (
                    <div className="p-3 bg-muted rounded-md">
                      <div className="text-xs font-semibold text-foreground mb-2">Error stack</div>
                      <pre className="text-xs font-mono text-muted-foreground whitespace-pre-wrap break-words">
                        {stack}
                      </pre>
                    </div>
                  )}

                  <div className="p-3 bg-muted rounded-md">
                    <div className="text-xs font-semibold text-foreground mb-2">React component stack</div>
                      <pre className="text-xs font-mono text-muted-foreground whitespace-pre-wrap break-words">
                        {this.state.componentStack || 'No component stack available.'}
                      </pre>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}
