import type { KeyOfOnlyStringKeys } from "@blazyts/better-standard-library";

import type { ServiceDefault } from "../Service";

export class ServiceManager<Services extends Record<string, ServiceDefault>> {
  config = {};
  public services: Services;

  constructor(services?: Services) {
    this.services = services ?? ({} as Services);
    this.hooks = [];
  }

  onServiceAdded(callback: (data: { name: string; service: ServiceDefault }) => void) { // in the future make it so that you add this method dynamically using the servcify function o that you create a servicified Service Manager
    this.hooks.push(callback);
  }

  addService<
    T extends ServiceDefault,
    TName extends string,
  >(v: {
    name: TName;
    service: T;
  },
  ): ServiceManager<
    Services
    & Record<TName, T>
  > {
    this.services[v.name] = v.service;
    return this as unknown as ServiceManager<Services & Record<TName, T>>;
  }

  getService<TName extends KeyOfOnlyStringKeys<Services>>(name: TName): Services[TName] {
    return this.services[name];
  }
}

// servicify(new ServiceManager({})).methods.addService.onCalled(v => {
//   console.log("Service added:", v);
// })
