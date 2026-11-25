import { defaultMapCenter, mapPosition, type MapPosition } from '../../utils/coordinates';

export interface City {
    label: string;
    position: MapPosition;
}

interface CitySearchResponse {
    features?: {
        geometry?: { coordinates?: [number, number] };
        properties?: { name?: string; city?: string; state?: string; country?: string };
    }[];
}

const searches = new Map<string, City[]>();

export const searchCities = async (query: string, signal: AbortSignal): Promise<City[]> => {
    const key = query.trim().toLocaleLowerCase('es');
    const cached = searches.get(key);
    if (cached) return cached;

    const url = new URL(import.meta.env.VITE_CITY_SEARCH_URL || 'https://photon.komoot.io/api/');
    url.searchParams.set('q', query.trim());
    url.searchParams.set('limit', '6');
    url.searchParams.set('lat', String(defaultMapCenter[0]));
    url.searchParams.set('lon', String(defaultMapCenter[1]));
    for (const layer of ['city', 'district', 'locality']) url.searchParams.append('layer', layer);

    const response = await fetch(url, { signal });
    if (!response.ok) throw new Error('El buscador de localidades no respondió. Podés marcar la ubicación directamente en el mapa.');
    const data: CitySearchResponse = await response.json();
    if (!Array.isArray(data.features)) throw new Error('El buscador no devolvió localidades válidas.');
    const results = new Map<string, City>();
    for (const feature of data.features) {
        const point = feature.geometry?.coordinates;
        const position = mapPosition(point?.[1], point?.[0]);
        const place = feature.properties;
        if (!position || !place?.name) continue;
        const label = [...new Set([place.name, place.city, place.state, place.country].filter(Boolean))].join(', ');
        if (!results.has(label)) results.set(label, { label, position });
    }

    const cities = [...results.values()];
    if (searches.size >= 50) searches.clear();
    searches.set(key, cities);
    return cities;
};
