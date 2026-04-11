// remake to use the custom function constrrcut from better standsrdx lib 

export function add<TExisting, TNew>(ctx: TExisting, thingToAdd: TNew): (ctx: TExisting) => Omit<TExisting, keyof TNew> & TNew {
        return (ctx: TExisting) => ({
                ...ctx,
                ...thingToAdd,
        })
}

