import { describe, expect, it } from 'vitest';
import { mapPosition } from '../coordinates';

describe('Ubicación de una obra', () => {
    it('conserva coordenadas válidas de registros existentes, incluso sobre el ecuador o el meridiano', () => {
        expect(mapPosition('0', '-64.18')).toEqual([0, -64.18]);
        expect(mapPosition(-31.42, 0)).toEqual([-31.42, 0]);
    });

    it('evita ubicar en el mapa registros con coordenadas vacías o inválidas', () => {
        expect(mapPosition('', -64)).toBeNull();
        expect(mapPosition(null, 0)).toBeNull();
        expect(mapPosition(0, 181)).toBeNull();
        expect(mapPosition(91, 0)).toBeNull();
    });
});
