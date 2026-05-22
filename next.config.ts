import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  turbopack: {
    resolveAlias: {
      // Replace @radix-ui/react-presence with a patched version that guards
      // against React 19's ref-callback-with-null on every render cleanup.
      // The upstream package calls setNode(null) on cleanup, causing an
      // infinite re-render loop in React 19.
      '@radix-ui/react-presence': './src/lib/react-presence.tsx',
      // FocusScope has the same React 19 useState-ref loop as react-presence
      '@radix-ui/react-focus-scope': './src/lib/react-focus-scope.tsx',
      // DismissableLayer has the same React 19 useState-ref loop
      '@radix-ui/react-dismissable-layer': './src/lib/react-dismissable-layer.tsx',
    },
  },
};

export default nextConfig;
