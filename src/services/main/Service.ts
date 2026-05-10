import type { URecord } from "@blazyts/better-standard-library";

export type ServiceBase<TConfig extends URecord> = {
  config: TConfig;

};

export type Service<T extends ServiceBase<URecord>> = {
  methods: {
    [MethodName in keyof T]: T[MethodName] extends (...args: any[]) => any
      ? {
          call: T[MethodName];
          onCalled: (callback: (v: { args: Parameters<T[MethodName]>[0]; result: ReturnType<T[MethodName]> }) => void) => void; // add hooks like before and after call later
        }
      : never;
  };
  config: T["config"];
};

export type ServiceDefault = ServiceBase<URecord>;

export function servicify<T extends ServiceDefault>(service: T): Service<T> {
  const methods: any = {};

  for (const key in service) {
    if (key === "config")
      continue;

    const method = service[key];
    if (typeof method === "function") {
      const callbacks: Array<(v: any) => void> = [];

      methods[key] = {
        call: method.bind(service),
        onCalled: (callback: (v: any) => void) => {
          callbacks.push(callback);
        },
      };

      const originalMethod = service[key];
      service[key] = function (...args: any[]) {
        const result = originalMethod.apply(service, args);
        callbacks.forEach(cb => cb({ args: args[0], result }));
        return result;
      };
    }
  }

  return {
    methods,
    config: service.config,
  };
}

class FileSavingService<TConfig extends { basePath: string; maxFileSize: number }> {
  constructor(public config: TConfig) { }
  uploadFile(args: { file: File }): string {
    // implementation to save the file to disk or cloud storage
    return "file-id";
  }
}

type k = Service<FileSavingService<{ basePath: string; maxFileSize: number }>>;

// const k: k = null

// k.config.basePath
