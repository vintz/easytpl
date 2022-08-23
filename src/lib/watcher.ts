export type WatchableObject<T> = Record<string|symbol, T|string|number|Array<unknown>|Function>

export interface Watchable extends WatchableObject<Watchable> {}
export interface WatchEvent 
{
    message: string,
    complement: {
        obj?: Watchable,
        prop?: unknown,
        value?: unknown,
        prefix?: string

    }
}

export const Watch = (src: Watchable | unknown[], cb: (e: WatchEvent)=> void, prefix: string = null, isArray: boolean = false) : any=> 
{   
    const handler: ProxyHandler<Watchable> = {
        set:(obj: Watchable, prop: any, value: any, receiver: any) => 
        {
            const res = Reflect.set(obj, prop, value, receiver)
            cb({message: 'SET', complement: {obj: proxy, prop, value, prefix}})
            return res
        },
        deleteProperty: (obj: Watchable, prop: any) => 
        {
            const res = Reflect.deleteProperty(obj, prop)
            cb({message: 'DELETE', complement: {obj: proxy, prop, prefix}})
            return res
        },
        get: (target: Watchable, key: any) =>
        {
            if (key == '__isProxy')
              return true;
        
            const prop = (target as Watchable)[key];
        
            if (typeof prop == 'undefined')
              return;
        
            if ( typeof prop === 'object' && (!(prop as Watchable)['__isProxy']))
            {
                (target as Watchable)[key] = Watch(prop, cb, prefix? `${prefix}.${key as string}`: key as string)
            }

            return (target as Watchable)[key];
        }
    }

    const proxy: any = new Proxy(src, handler)
   
    src = proxy
    return proxy
}
