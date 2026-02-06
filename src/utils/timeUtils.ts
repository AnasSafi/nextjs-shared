export function delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

export type TimeDiff = {
    years: number;
    months: number;
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
    totalDays: number;
    isPast: boolean;
};

export const calculateTimeUntil = (targetDate: Date): TimeDiff => {
    const now = new Date();

    if (now > targetDate) {
        return {
            years: 0,
            months: 0,
            days: 0,
            hours: 0,
            minutes: 0,
            seconds: 0,
            totalDays: 0,
            isPast: true,
        };
    }

    const totalDaysDifference = Math.floor(
        (targetDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    );

    let yearsDifference = targetDate.getFullYear() - now.getFullYear();
    let monthsDifference = targetDate.getMonth() - now.getMonth();
    let daysDifference = targetDate.getDate() - now.getDate();
    let hoursDifference = targetDate.getHours() - now.getHours();
    let minutesDifference = targetDate.getMinutes() - now.getMinutes();
    let secondsDifference = targetDate.getSeconds() - now.getSeconds();

    if (secondsDifference < 0) {
        secondsDifference += 60;
        minutesDifference--;
    }

    if (minutesDifference < 0) {
        minutesDifference += 60;
        hoursDifference--;
    }

    if (hoursDifference < 0) {
        hoursDifference += 24;
        daysDifference--;
    }

    if (daysDifference < 0) {
        const prevMonthLastDay = new Date(
            targetDate.getFullYear(),
            targetDate.getMonth(),
            0
        );
        daysDifference += prevMonthLastDay.getDate();
        monthsDifference--;
    }

    if (monthsDifference < 0) {
        monthsDifference += 12;
        yearsDifference--;
    }

    return {
        years: yearsDifference,
        months: monthsDifference,
        days: daysDifference,
        hours: hoursDifference,
        minutes: minutesDifference,
        seconds: secondsDifference,
        totalDays: totalDaysDifference,
        isPast: false,
    };
};
