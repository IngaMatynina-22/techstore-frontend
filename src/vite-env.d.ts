/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_MANAGER_NAME?: string
  readonly VITE_MANAGER_PHONE?: string
  readonly VITE_MANAGER_EMAIL?: string
}

declare module '*.css' {
  const css: string
  export default css
}
