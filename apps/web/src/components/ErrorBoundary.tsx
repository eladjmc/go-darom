import { Component, type ErrorInfo, type ReactNode } from "react";
import { AppErrorPage } from "../pages/errors/AppErrorPage";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

/** Catches unexpected render failures; never surfaces stack traces to users. */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    if (import.meta.env.DEV) {
      console.error("ErrorBoundary caught", error, info.componentStack);
    }
  }

  render() {
    if (this.state.hasError) {
      return <AppErrorPage kind="server" />;
    }
    return this.props.children;
  }
}
