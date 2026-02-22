import {FilterModel} from "../../models/core/dbModels";

export type FilterReadableValueResolver = (f: FilterModel) => string | undefined | Promise<string | undefined>;

/**
 * Populate `readableValue` for each filter item.
 *
 * - Accepts a **filters** array (may be `undefined`).
 * - Accepts a **resolvers** map whose keys are field names and whose values
 *   are functions that convert a `FilterModel` to a display string.
 *   A resolver can be synchronous (`string | undefined`) **or** asynchronous
 *   (`Promise<string | undefined>`).
 * - If a filter already has `readableValue`, that entry is skipped.
 *
 * **Example**
 * ```ts
 * await injectReadableValuesAsync({filters, resolvers: {
 *   // Synchronous resolver using local translations
 *   postMonetizationStatus: (f) =>
 *     t(toLowerCamelCase(`post_monetization_status_${f.value}`)),
 *
 *   // Asynchronous resolver fetching investor name from the DB
 *   investorId: async (f) => {
 *     const investorName = await new InvestorQueries().getNameById(Number(f.value));
 *     return investorName;
 *   },
 *
 *   // Asynchronous resolver fetching currency name from an external service
 *   currency: async (f) => {
 *     const { name } = await currencyService.getByCode(String(f.value));
 *     return name;
 *   },
 * }});
 * ```
 */
export async function injectReadableValuesAsync(args: {
    filters: FilterModel[] | undefined;
    resolvers: Record<string, FilterReadableValueResolver>;
}): Promise<void> {
    const {filters, resolvers} = args;
    if (!filters?.length) return;

    await Promise.all(
        filters.map(async (f: FilterModel): Promise<void> => {
            if (f.readableValue) return;

            const resolver = resolvers[f.field];
            if (!resolver) return;

            const result: string | undefined = await resolver(f);
            if (result !== undefined) f.readableValue = result;
        }),
    );
}
