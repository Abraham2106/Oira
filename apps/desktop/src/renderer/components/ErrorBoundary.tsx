import { Component, type ReactNode } from "react"

type ErrorBoundaryProps = { children: ReactNode }
type ErrorBoundaryState = { crashed: boolean }

export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { crashed: false }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { crashed: true }
  }

  render() {
    if (this.state.crashed) {
      return (
        <div className="error" role="alert">
          <p>Algo salió mal en esta pantalla.</p>
          <button
            className="nl-button"
            type="button"
            onClick={() => this.setState({ crashed: false })}
          >
            Volver a intentarlo
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
