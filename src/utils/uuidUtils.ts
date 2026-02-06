export function isValidUUID(uuid: string | null | undefined): boolean {
    if (uuid === null || uuid === undefined) return false;

    const regex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-4[0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/;
    return regex.test(uuid);
}
