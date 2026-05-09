import { Component } from 'react';
import { AlertTriangle } from 'lucide-react';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('[ErrorBoundary]', error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[40vh] gap-4 text-center p-8">
          <div className="p-4 rounded-full bg-rose-50 text-rose-500">
            <AlertTriangle size={28} />
          </div>
          <div>
            <h3 className="font-semibold text-stone-800 text-lg mb-1">Something went wrong</h3>
            <p className="text-stone-500 text-sm max-w-sm">{String(this.state.error.message || this.state.error)}</p>
          </div>
          <button
            onClick={() => this.setState({ error: null })}
            className="px-4 py-2 bg-stone-900 text-white rounded-lg text-sm font-medium hover:bg-stone-700 transition-colors"
          >
            Try again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
