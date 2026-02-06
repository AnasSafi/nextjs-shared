const formatString = (color: string, text: string): [string, string?] => {
    if (typeof window !== "undefined") {
        return [`%c${text}`, `color: ${color}`];
    }

    const colorCodes: Record<string, string> = {
        blue: "\x1b[34m",
        yellow: "\x1b[33m",
        red: "\x1b[31m",
        green: "\x1b[32m",
    };

    return [`${colorCodes[color] || colorCodes.blue}${text}\x1b[0m`];
};

export type ConsoleMessage = unknown;

export const ConsoleUtils = {
    log: (message: ConsoleMessage) => {
        console.log(message);
    },

    info: (message: ConsoleMessage) => {
        const formatted = formatString("blue", "[INFO]");
        console.info(formatted[0], formatted[1] || "", message);
    },

    warn: (message: ConsoleMessage) => {
        const formatted = formatString("yellow", "[WARNING]");
        console.warn(formatted[0], formatted[1] || "", message);
    },

    error: (message: ConsoleMessage) => {
        const formatted = formatString("red", "[ERROR]");
        console.error(formatted[0], formatted[1] || "", message);
    },

    success: (message: ConsoleMessage) => {
        const formatted = formatString("green", "[SUCCESS]");
        console.log(formatted[0], formatted[1] || "", message);
    },
};

export default ConsoleUtils;
