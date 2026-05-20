import { Component } from 'react'

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, info) {
    console.error('Page error:', error, info)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center h-full min-h-[400px] p-8 text-center">
          <span className="material-symbols-outlined text-[48px] text-[#e0e0e0] mb-4">error_outline</span>
          <h2 className="text-base font-semibold text-[#111111] mb-1">Something went wrong</h2>
          <p className="text-sm text-[#9e9e9e] mb-4">This page ran into an error. Try refreshing.</p>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            className="px-4 py-2 bg-[#0f00da] text-white text-sm font-semibold rounded-xl hover:bg-[#0d00c0] transition-colors"
          >
            Try again
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
