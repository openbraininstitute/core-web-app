import { Filter } from "@/components/Filter/types";
import { toDate } from "@/util/date";


const DATE_FIELDS = new Set(['creation_date', 'update_date', 'registration_date']);

const SPECIAL_FIELDS: Record<string, string> = {
    name: 'name__ilike',
};

type TransformFiltersToQueryReturnValue = Record<string, string | Array<string> | number | Array<number> | Date | null>;

export const transformFiltersToQuery = (filters: Filter[]): TransformFiltersToQueryReturnValue => {
    return filters.reduce((acc, filter) => {
        const fieldKey = SPECIAL_FIELDS[filter.field] || filter.field;

        if (filter.value !== null && typeof filter.value === 'object' && !Array.isArray(filter.value)) {
            Object.entries(filter.value).forEach(([operator, val]) => {
                if (val !== null) {
                    acc[`${fieldKey}__${operator}`] = DATE_FIELDS.has(filter.field) ? toDate(val.toString()) : val;
                }
            });
        } else if (filter.value !== null) {
            acc[fieldKey] = DATE_FIELDS.has(filter.field) ? toDate(filter.value.toString()) : filter.value;
        }

        return acc;
    }, {} as TransformFiltersToQueryReturnValue);
};