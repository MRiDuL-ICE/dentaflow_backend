declare module 'node-pg-migrate' {
  export function run(options: any): Promise<void>;
  export function runner(options: any): Promise<void>;
}
