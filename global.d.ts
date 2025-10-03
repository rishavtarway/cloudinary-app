import 'react';

declare module 'react' {
  interface VideoHTMLAttributes<T> extends HTMLAttributes<T> {
    loading?: 'eager' | 'lazy';
  }
}
