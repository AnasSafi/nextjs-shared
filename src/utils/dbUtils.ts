import type {SelectModel, TableRelation} from "../models/core/dbModels";

type SelectLeaf = boolean;
type SelectNode = {select?: Record<string, boolean>};

type Primitive = string | number | boolean | Date | null | undefined;
type WhereValue = Primitive | Record<string, unknown>;
export type PrismaLikeWhere = Record<string, WhereValue>;

function sqlLiteral(value: Primitive): string {
    if (value === null || value === undefined) return "NULL";
    if (value instanceof Date) return `'${value.toISOString().replace(/'/g, "''")}'`;
    if (typeof value === "number") return Number.isFinite(value) ? String(value) : "NULL";
    if (typeof value === "boolean") return value ? "TRUE" : "FALSE";
    return `'${String(value).replace(/'/g, "''")}'`;
}

function ident(name: string): string {
    return `"${String(name).replace(/"/g, '""')}"`;
}

export function prismaSelectToRawSQL(
    selectObj: SelectModel,
    mainTable: string,
    relations: TableRelation[] = [],
): {selectSql: string; joinSql: string} {
    const selectSqlParts: string[] = [];
    const joinSqlParts = new Set<string>();

    if (typeof selectObj === "object" && selectObj !== null) {
        Object.keys(selectObj).forEach((key) => {
            const value = (selectObj as Record<string, unknown>)[key] as SelectLeaf | SelectNode;
            const capitalizedKey = key.charAt(0).toUpperCase() + key.slice(1);

            if (value === true) {
                selectSqlParts.push(`"${mainTable}"."${key}"`);
                return;
            }

            if (typeof value === "object" && value !== null) {
                const subSelect = (value as SelectNode).select;
                if (!subSelect) return;

                Object.keys(subSelect).forEach((subKey) => {
                    const subVal = subSelect[subKey];
                    if (!subVal) return;

                    selectSqlParts.push(`"${capitalizedKey}"."${subKey}"`);

                    const relation = relations.find(
                        (r) => r.mainTable === mainTable && r.relatedTable === capitalizedKey,
                    );

                    if (relation) {
                        const joinClause =
                            `LEFT JOIN "${relation.relatedTable}" "${capitalizedKey}" ON "${mainTable}"."${relation.joinColumn}" = "${capitalizedKey}"."${relation.relatedColumn}"`;
                        joinSqlParts.add(joinClause);
                    }
                });
            }
        });
    }

    const selectSql = selectSqlParts.join(", ");
    const joinSql = Array.from(joinSqlParts).join(" ");

    return {selectSql, joinSql};
}

/** Get a logical array (AND/OR/NOT) case-insensitively, without using `any`. */
function getLogicalArray(
    obj: PrismaLikeWhere,
    keyUpper: "AND" | "OR" | "NOT",
): PrismaLikeWhere[] | undefined {
    const direct = obj[keyUpper];
    if (Array.isArray(direct)) return direct as PrismaLikeWhere[];

    const lowerKey = keyUpper.toLowerCase();
    const lowerVal = (obj as Record<string, unknown>)[lowerKey];
    if (Array.isArray(lowerVal)) {
        return (lowerVal as unknown[]).filter(
            (v): v is PrismaLikeWhere => typeof v === "object" && v !== null,
        ) as PrismaLikeWhere[];
    }
    return undefined;
}

export function prismaWhereToRawSQL(
    whereObj: PrismaLikeWhere,
    mainTable: string,
    relations: TableRelation[] = [],
): string {
    const whereSqlParts: string[] = [];

    if (!whereObj || typeof whereObj !== "object") return "";

    Object.keys(whereObj).forEach((key) => {
        const value = whereObj[key];

        if (value === undefined || value === null || value === "") return;

        const capitalizedKey = key.charAt(0).toUpperCase() + key.slice(1);

        // Legacy support: lowercase `not` as array
        if (key === "not") {
            if (Array.isArray(value)) {
                const notParts: string[] = [];
                for (const notCondition of value) {
                    if (!notCondition || typeof notCondition !== "object") continue;
                    const subNot = prismaWhereToRawSQL(notCondition as PrismaLikeWhere, mainTable, relations);
                    if (subNot) notParts.push(`NOT (${subNot})`);
                }
                if (notParts.length > 0) whereSqlParts.push(notParts.join(" AND "));
            }
            return;
        }

        // AND/OR/NOT (case-insensitive) arrays
        const lowerKey = key.toLowerCase();
        if (lowerKey === "and" || lowerKey === "or" || lowerKey === "not") {
            const arr = Array.isArray(value)
                ? (value as unknown[]).filter((v): v is PrismaLikeWhere => typeof v === "object" && v !== null)
                : (getLogicalArray(whereObj, lowerKey.toUpperCase() as "AND" | "OR" | "NOT") ?? []);

            if (arr.length === 0) return;

            const parts = arr
                .map((w) => prismaWhereToRawSQL(w, mainTable, relations))
                .filter((s) => s && s.trim().length > 0);

            if (parts.length === 0) return;

            if (lowerKey === "and") whereSqlParts.push(`(${parts.join(" AND ")})`);
            if (lowerKey === "or") whereSqlParts.push(`(${parts.join(" OR ")})`);
            if (lowerKey === "not") whereSqlParts.push(parts.map((s) => `NOT (${s})`).join(" AND "));
            return;
        }

        // Object handling
        if (typeof value === "object" && !(value instanceof Date) && !Array.isArray(value)) {
            const obj = value as Record<string, unknown>;

            // Keep legacy behavior for relation filter: { relation: { some: {...} } } (ignored)
            if (Object.prototype.hasOwnProperty.call(obj, "some")) {
                const someVal = obj["some"];
                if (!someVal || typeof someVal !== "object") return;
                if (Object.keys(someVal as object).length === 0) return;
                void prismaWhereToRawSQL(someVal as PrismaLikeWhere, capitalizedKey, relations);
                return;
            }

            const subWhere = prismaWhereToRawSQL(obj as PrismaLikeWhere, capitalizedKey, relations);
            if (subWhere) whereSqlParts.push(subWhere);
            return;
        }

        whereSqlParts.push(`${ident(mainTable)}.${ident(key)} = ${sqlLiteral(value as Primitive)}`);
    });

    return whereSqlParts.filter((p) => p.trim().length > 0).join(" AND ");
}