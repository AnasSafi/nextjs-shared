"use client";

import {useUserStore} from "../../store/userStore";

type LegacyTimeZoneCarrier = {
    timezone?: unknown;
};

function normalizeTimeZoneValue(value: unknown): string | undefined {
    if (typeof value !== "string") return undefined;
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
}

function hasLegacyTimeZone(value: unknown): value is LegacyTimeZoneCarrier {
    return typeof value === "object" && value !== null && "timezone" in value;
}

/**
 * Reads user timezone from the client user store.
 *
 * Priority:
 * 1) user.userModel.userSettingModel.timezone
 * 2) legacy fallback: user.timezone
 */
export function useUserTimeZone(): string | undefined {
    const user = useUserStore((state) => state.user);

    const userSettingTimezone = normalizeTimeZoneValue(
        user?.userModel?.userSettingModel?.timezone,
    );
    if (userSettingTimezone) return userSettingTimezone;

    if (hasLegacyTimeZone(user)) {
        return normalizeTimeZoneValue(user.timezone);
    }

    return undefined;
}
