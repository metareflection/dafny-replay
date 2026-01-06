export function Footer() {
  return (
    <footer className="app-footer">
      <span>
        This is a demo app for{' '}
        <a href="https://github.com/metareflection/dafny-replay" target="_blank" rel="noopener noreferrer">
          dafny-replay
        </a>
        . All state transitions verified by Dafny.
      </span>
      {/* <span className="app-footer__separator">·</span> */}
      <span>
        Learn more at{' '}
        <a href="https://midspiral.com/blog" target="_blank" rel="noopener noreferrer">
          Midspiral.
        </a>
      </span>
    </footer>
  )
}

