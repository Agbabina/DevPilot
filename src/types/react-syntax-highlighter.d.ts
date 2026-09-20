declare module 'react-syntax-highlighter' {
  import type { ComponentType, HTMLAttributes } from 'react';

  export const Prism: ComponentType<
    HTMLAttributes<HTMLElement> & {
      language?: string;
      style?: Record<string, unknown>;
      PreTag?: string;
    }
  >;
}

declare module 'react-syntax-highlighter/dist/esm/styles/prism' {
  export const oneDark: Record<string, unknown>;
}
