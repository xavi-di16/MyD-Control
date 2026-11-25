import { describe, expect, it } from 'vitest';
import { renderLegacyDocument, type PrintDraft } from '../legacyPrintDocument';

const draft: PrintDraft = {
    number: '#001-2026', date: '2026-11-23', client: 'Cliente', detail: 'Córdoba', description: 'Texto de prueba',
    sections: [{ title: 'Título <b>literal</b>', content: 'Primera tarea\n\n <b>Segunda tarea</b>' }],
    notes: 'Una aclaración', price: '$ 450.000', deadline: 'Una jornada', payment: 'Contra entrega',
};

describe('Datos de las plantillas de impresión', () => {
    it('conserva los grupos, viñetas y texto literal del presupuesto', () => {
        const frame = document.implementation.createHTMLDocument();
        frame.body.innerHTML = '<div id="scopeSection"><div id="outSections"></div></div><div id="notesSection"><div id="outNotes"></div></div>';
        renderLegacyDocument(frame, draft, 'budget');
        expect(frame.querySelector('.work-item-group > .work-item-title')?.textContent).toBe('Título <b>literal</b>');
        expect([...frame.querySelectorAll('.work-item-group li')].map((item) => item.textContent))
            .toEqual(['Primera tarea', '<b>Segunda tarea</b>']);
        expect(frame.querySelector('#outNotes li')?.textContent).toBe('Una aclaración');
        expect(frame.querySelector('b')).toBeNull();
    });

    it('oculta el alcance y las aclaraciones cuando no se cargaron datos', () => {
        const frame = document.implementation.createHTMLDocument();
        frame.body.innerHTML = '<div id="scopeSection"><div id="outSections"></div></div><div id="notesSection"><div id="outNotes"></div></div>';
        renderLegacyDocument(frame, { ...draft, sections: [], notes: '' }, 'budget');
        expect(frame.getElementById('scopeSection')?.style.display).toBe('none');
        expect(frame.getElementById('notesSection')?.style.display).toBe('none');
    });
});
