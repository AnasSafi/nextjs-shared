"use client";

import React, {ChangeEvent, useState} from "react";

export interface XCheckboxProps {
    label?: string;
    initialValue?: boolean;
    onChange?: (event: ChangeEvent<HTMLInputElement>, shouldDelete: boolean) => void;
    name?: string;
    value?: string | number;
}

export const XCheckbox: React.FC<XCheckboxProps> = ({
    label,
    initialValue = false,
    onChange,
    name,
    value,
}) => {
    const [isChecked, setIsChecked] = useState(initialValue);

    const toggleCheck = () => {
        const newState = !isChecked;
        setIsChecked(newState);

        if (onChange) {
            // Create a synthetic event object to mimic a normal ChangeEvent
            const syntheticEvent = {
                target: {
                    name: name,
                    type: "checkbox",
                    value: value,
                    checked: newState,
                },
            } as React.ChangeEvent<HTMLInputElement>;

            onChange(syntheticEvent, false);
        }
    };

    return (
        <div onClick={toggleCheck} className="cursor-pointer">
            <div className="relative x-style">
                <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => {}}
                    className="hidden"
                    readOnly
                    name={name}
                    value={value}
                />
                <label
                    className={`block w-4 h-4 bg-gray-100 dark:bg-gray-700 border border-gray-300 rounded-sm cursor-pointer ${
                        isChecked ? "bg-red-500" : ""
                    }`}
                ></label>
                <div className="absolute inset-0 flex items-center justify-center">
                    <label
                        className={`text-xs text-red-500 ${
                            isChecked ? "opacity-100" : "opacity-0"
                        } select-none`}
                    >
                        X
                    </label>
                </div>
            </div>
            {label && (
                <label className="ml-2 text-sm font-medium text-gray-900">
                    {label}
                </label>
            )}
        </div>
    );
};
