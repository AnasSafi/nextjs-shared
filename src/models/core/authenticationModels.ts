export interface ProcessedPermission {
    key: string;
    forAllRoles?: boolean;
    justForAdmin?: boolean;
}

export interface PermissionModel {
    id: string;
    permissionKey: string;
    name: unknown;
    forAllRoles: boolean;
    justForAdmin: boolean;
}
