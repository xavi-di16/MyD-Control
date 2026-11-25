import type { WorkStatus } from '../../types';

export const houseUnderConstruction = 'M2 11 12 3l10 8M5 10v11h14V10M9 21v-6h6v6M5 13h14M7 12v-2m10 2v-2';

export const workStatuses: Record<WorkStatus, {
    label: string;
    color: string;
    background: string;
    symbol: string;
}> = {
    planned: {
        label: 'Planificada', color: '#155E75', background: '#E0F2FE',
        symbol: 'M5 3h14v18H5zM8 7h8v10H8zM8 12h5m0 0v5',
    },
    active: {
        label: 'En ejecución', color: '#854D0E', background: '#FEF3C7',
        symbol: 'M14 5a5 5 0 0 0-6 6l-5 5a2 2 0 0 0 3 3l5-5a5 5 0 0 0 6-6l-3 3-3-3 3-3zM15 15l5 5',
    },
    paused: {
        label: 'Pausada', color: '#1E40AF', background: '#DBEAFE',
        symbol: 'M3 7l9-4 9 4v10l-9 4-9-4zM3 7l9 4 9-4M12 11v10M7 13l2 1m6 0 2-1',
    },
    completed: {
        label: 'Finalizada', color: '#166534', background: '#DCFCE7',
        symbol: 'm5 12 4 4L19 6',
    },
};

export const workStatusOptions = Object.entries(workStatuses) as [WorkStatus, (typeof workStatuses)[WorkStatus]][];
