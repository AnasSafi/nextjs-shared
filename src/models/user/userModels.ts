import type {MultiLangValue} from "../core/localeModels";
import type {MediaFileViewModel} from "../core/mediaModels";
import type {PaginationModel, SelectOptionModel} from "../core/dbModels";
import type {PermissionModel} from "../core/authenticationModels";
import type {SystemPreferencesModel} from "../core/systemModels";

export interface UserStateModel {
    isInitialized: boolean;
    user: User | null;
    setUser: (user: User) => void;
    clearUser: () => void;
}

export interface UserSettingModel {
    incompleteProfile?: boolean;
}

export interface CompleteProfile {
    isVerify?: boolean;
    personalData?: boolean;
    residenceInfo?: boolean;
    legalDocs?: boolean;
    completePercent?: number;
}

export interface UserProperties {
    needVerify?: boolean;
    isSuperAdmin?: boolean;
}

export interface UserPreferencesType {
    displayLanguage: string;
    darkMode: boolean;
}

export interface UserModel {
    id: string;
    personalPhoto?: MediaFileViewModel[];
    firstName: MultiLangValue;
    secondName?: MultiLangValue;
    thirdName?: MultiLangValue;
    lastName: MultiLangValue;
    fullName?: string;
    birthdate?: Date | null;
    email: string;
    mobileNumber: string;
    whatsappNumber: string;
    thumpUrl?: string | null;
    userPreferences?: UserPreferencesType;
    tokens?: {
        accessToken: string;
        refreshToken?: string;
    };
    permissions: PermissionModel[];
    systemPreferences?: SystemPreferencesModel;
    userSettingModel?: UserSettingModel;
    completeProfile: CompleteProfile;
    properties?: UserProperties;
}

export class User {
    userModel: UserModel;

    constructor(data: Omit<UserModel, "hasOneOfPermissions" | "hasAllPermissions" | "hasAnyAdminPermission">) {
        this.userModel = data;
    }

    hasOneOfPermissions(requiredPermissions: string[]): boolean {
        return requiredPermissions.some(permissionKey =>
            this.userModel.permissions.some(p => p.permissionKey === permissionKey)
        );
    }

    hasAllPermissions(requiredPermissions: string[]): boolean {
        return requiredPermissions.every(permissionKey =>
            this.userModel.permissions.some(p => p.permissionKey === permissionKey)
        );
    }

    hasAnyAdminPermission(): boolean {
        return this.userModel.permissions.some(permission => permission.justForAdmin);
    }
}

export interface LoadFormRequestResetPasswordRequestModel {
    username?: string;
}

export interface RequestResetPasswordRequestModel {
    username: string;
}

export interface RequestResetPasswordSuccessResponseModel {
    ref: string;
}

export interface ResetPasswordCodeRequestModelBase {
    ref: string;
    resetCode: string;
}

export interface ResetPasswordCodeSuccessResponseModel {
    ref: string;
    name: string;
}

export interface ChangePasswordRequestModel {
    ref: string;
    password: string;
    passwordConfirmation: string;
}

export interface ChangePasswordCodeRequestModel {
    ref: string;
    password: string;
}

export interface SaveSelectInvestorBodyModel {
    userId: string;
    financeProfile: string;
}

export interface SaveSelectInvestorResponseModel {
    userId: string;
    financeProfile: string | null;
}

export interface UserPublicProfileModel {
    userId: string;
    fullName: string | null;
    personalPhoto: MediaFileViewModel;
}

export interface SelectInvestorFormBodyModel {
    invOppId?: string | null;
}

export interface LoadFormSelectInvestorResponseModel {
    selectedUser?: SelectOptionModel | null;
}

export interface SelectInvestorLookupsModel {
    investorsList: PaginationModel;
    financeProfilesList: PaginationModel;
}

export interface LoginResponseOptionsModelsBase<TUser = unknown> {
    rememberMe?: boolean;
    user?: TUser | null;
}

export interface SignInRequestModel {
    username?: string;
    password?: string;
    rememberMe?: boolean;
}

export interface profileResponseModels {
    user: UserModel;
}
