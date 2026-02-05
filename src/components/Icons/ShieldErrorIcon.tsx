"use client";

import React from "react";

export type ShieldErrorIconProps = {
    className?: string;
};

export function ShieldErrorIcon(props: ShieldErrorIconProps): React.ReactElement {
    const {className} = props;

    return (
        <div className={className}>
            <svg
                width="50"
                height="50"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
            >
                <path
                    d="M12 2L3 5V12C3 16.9706 6.37258 21.1622 11.7029 22.9585C11.9347 23.0364 12.0653 23.0364 12.2971 22.9585C17.6274 21.1622 21 16.9706 21 12V5L12 2ZM7.70711 9.29289L9.12132 10.7071L12 7.82843L14.8787 10.7071L16.2929 9.29289L13.4142 6.41421C13.0237 6.02369 12.3905 6.02369 12 6.41421L9.12132 9.29289L7.70711 9.29289ZM16.2929 14.7071L14.8787 13.2929L12 16.1716L9.12132 13.2929L7.70711 14.7071L10.5858 17.5858C10.9763 17.9763 11.6095 17.9763 12 17.5858L14.8787 14.7071L16.2929 14.7071Z"
                    fill="currentColor"
                />
            </svg>
        </div>
    );
}
