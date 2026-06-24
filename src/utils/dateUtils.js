export const parseDateToDdMmYyyy = (dateStr) => {
    if (!dateStr) return 'Unknown Date';
    try {
        if (!isNaN(dateStr) && typeof dateStr !== 'boolean') {
            const d = new Date(parseInt(dateStr));
            if (!isNaN(d.getTime())) {
                const dd = String(d.getDate()).padStart(2, '0');
                const mm = String(d.getMonth() + 1).padStart(2, '0');
                const yyyy = d.getFullYear();
                return `${dd}-${mm}-${yyyy}`;
            }
        }
        
        const d = new Date(dateStr);
        if (!isNaN(d.getTime())) {
            const dd = String(d.getDate()).padStart(2, '0');
            const mm = String(d.getMonth() + 1).padStart(2, '0');
            const yyyy = d.getFullYear();
            return `${dd}-${mm}-${yyyy}`;
        }

        const slashParts = dateStr.split(',')[0].split('/');
        if (slashParts.length === 3) {
            const dd = slashParts[0].padStart(2, '0');
            const mm = slashParts[1].padStart(2, '0');
            const yyyy = slashParts[2];
            return `${dd}-${mm}-${yyyy}`;
        }

        const dashParts = dateStr.split(' ')[0].split('-');
        if (dashParts.length === 3) {
            if (dashParts[0].length === 4) {
                return `${dashParts[2].padStart(2, '0')}-${dashParts[1].padStart(2, '0')}-${dashParts[0]}`;
            } else {
                return `${dashParts[0].padStart(2, '0')}-${dashParts[1].padStart(2, '0')}-${dashParts[2]}`;
            }
        }
    } catch (e) {
        console.error("Error parsing local date:", dateStr, e);
    }
    return 'Unknown Date';
};

export const getTodayDdMmYyyy = () => {
    const d = new Date();
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    return `${dd}-${mm}-${yyyy}`;
};
