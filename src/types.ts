import type { URecord } from "@blazyts/better-standard-library"
import { z, ZodBoolean, ZodNumber, ZodString, type ZodObject, type ZodRawShape, type ZodTypeAny } from "zod"

export interface ICrudified<Name extends string>{
   getName(): Name
   getOne : <F, T>(v: T) => F
   create: <F>(f: F) => void
   update: <F>(f: F) => void
   delete: <F>(f: F) => void
   query: <F,R>(f: F) => R 
   getAll: <R>() => R 
}


export type HandlerProtocol = 'POST' | 'GET' | 'PUT' | 'DELETE' | 'PATCH' | 'ws' | 'http';

function CrudifyStrict<Name extends string, Model>(
    name: Name,
    model: Model,
    methods: {
      getOne: (query: Partial<Model>) => Model;
      getAll: () => Model[] | Record<string, Model>;
      query: (query: Partial<Model>) => Model[];
      create: (data: Model) => void;
      delete: (query: Partial<Model>) => void;
      update: (query: Partial<Model>) => void;
    }
  ): ICrudified<Name> {
    return {
      getName: () => name,
  
      getOne: <F, T>(v: T): F => methods.getOne(v as Partial<Model>) as unknown as F,
  
      create: <F>(f: F): void => methods.create(f as unknown as Model),
  
      update: <F>(f: F): void => methods.update(f as unknown as Partial<Model>),
  
      delete: <F>(f: F): void => methods.delete(f as unknown as Partial<Model>),
  
      query: <F, R>(f: F): R => methods.query(f as unknown as Partial<Model>) as unknown as R,
  
      getAll: <R>(): R => methods.getAll() as unknown as R,
    };
  }

function CrudifiedStrictValidated<
Name extends string
, Model
>(
    name: Name,
    args: ,
    model: Model,
    methods: {
        getOne: (query: Partial<Model>) => Model;
        getAll: () => Model[] | Record<string, Model>;
        query: (query: Partial<Model>) => Model[];
        create: (data: Model) => void;
        delete: (query: Partial<Model>) => void;
        update: (query: Partial<Model>) => void;
  }): ICrudified<Name> {
    return CrudifyStrict(name, model, methods);
  }


// allows you to  add schema validation to an existing service so that you do not have ti rewrite your services and can essentially take a normal service and add validatopn

function Schemify<T extends URecord, Validators extends {
    [K in keyof T]: PrimitiveToZod<Parameters<T[K]>[0]> 
}>(v: T, validators: Validators){
    const result = {} as any;
    for (const key in v) {
        if (Object.prototype.hasOwnProperty.call(v, key)) {
            const capitalizedKey = key.charAt(0).toUpperCase() + key.slice(1);
            const eventKey = `on${capitalizedKey}` as const;
            
            const fn = ((value?: any) => {
                return v[key](value);
            }) as any;
            
            fn[eventKey] = (value: any) => v[key](value);
            
            result[key] = fn;
        }
    }
    
    return result as Subscribeable<T>;
}

type PrimitiveToZod<T> =
  T extends string ? ZodString :
  T extends number ? ZodNumber :
  T extends boolean ? ZodBoolean :
  T extends object ? ZodObject<ToZodShape<T>> :
  ZodTypeAny;

type ToZodShape<T> = {
  [K in keyof T]: PrimitiveToZod<T[K]>;
} & ZodRawShape;



Schemify({ji: (v: string) => {}}, {ji: z.string()})
