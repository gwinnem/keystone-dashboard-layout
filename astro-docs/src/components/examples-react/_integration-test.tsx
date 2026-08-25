import { useState } from 'react';

/**
 * Minimal smoke-test component — confirms the @astrojs/react
 * integration itself actually works (client-side hydration, state,
 * event handlers) before building anything real on top of it. Not a
 * permanent example; safe to delete once verified.
 */
export default function ReactIntegrationTest() {
  const [count, setCount] = useState(0);
  return (
    <button onClick={() => setCount((c) => c + 1)} type="button">
      React integration test — clicked {count} times
    </button>
  );
}
