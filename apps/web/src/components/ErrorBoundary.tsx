import { Component, type ErrorInfo, type ReactNode } from "react";
import { Moon } from "lucide-react";
export class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(_error: Error, _info: ErrorInfo) {
    console.error("MoonWeight could not render this screen.");
  }
  render() {
    if (this.state.failed)
      return (
        <main className="session-loading">
          <Moon size={28} />
          <h1>Let’s open your space again.</h1>
          <p>The screen could not load. Your saved readings are still on your server.</p>
          <button type="button" className="button primary" onClick={() => window.location.reload()}>
            Reload MoonWeight
          </button>
        </main>
      );
    return this.props.children;
  }
}
