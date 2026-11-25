export type MapPosition = [latitude: number, longitude: number];
export const defaultMapCenter: MapPosition = [-31.4201, -64.1888];

const readCoordinate = (value: unknown) => {
    if (typeof value === 'number' || (typeof value === 'string' && value.trim())) return Number(value);
    return NaN;
};

export const mapPosition = (latitude: unknown, longitude: unknown): MapPosition | null => {
    const lat = readCoordinate(latitude);
    const lng = readCoordinate(longitude);
    return Math.abs(lat) <= 90 && Math.abs(lng) <= 180 ? [lat, lng] : null;
};
