export interface PrintSection {
    title: string;
    content: string;
}

export interface PrintDraft {
    number: string;
    date: string;
    client: string;
    detail: string;
    description: string;
    sections: PrintSection[];
    notes: string;
    price: string;
    deadline: string;
    payment: string;
}

export const renderLegacyDocument = (document: Document, draft: PrintDraft, kind: 'budget' | 'report') => {
    const text = (id: string, value: string) => {
        const element = document.getElementById(id);
        if (element) element.innerText = value;
    };
    const list = (container: HTMLElement, value: string) => {
        container.replaceChildren();
        if (!value) return;
        const ul = document.createElement('ul');
        ul.style.margin = '0';
        ul.style.paddingLeft = '18px';
        for (const line of value.split('\n')) {
            if (!line.trim()) continue;
            const li = document.createElement('li');
            li.textContent = line.trim();
            ul.append(li);
        }
        container.append(ul);
    };

    text('outClient', draft.client || 'Nombre Cliente');
    text('outClientDetail', draft.detail);
    text('outNum', draft.number);
    text('outDate', draft.date.split('-').reverse().join('/'));

    if (kind === 'report') {
        text('outReportText', draft.description || 'El texto del informe técnico aparecerá aquí...');
        return;
    }

    text('outObject', draft.description);
    text('outPrice', draft.price);
    text('outTime', draft.deadline);
    text('outPayment', draft.payment);

    const container = document.getElementById('outSections');
    const scope = document.getElementById('scopeSection');
    if (container && scope) {
        scope.style.display = draft.sections.length ? 'block' : 'none';
        container.replaceChildren();
        for (const section of draft.sections) {
            const group = document.createElement('div');
            group.className = 'work-item-group';
            const heading = document.createElement('div');
            heading.className = 'work-item-title';
            heading.textContent = section.title;
            const body = document.createElement('div');
            body.className = 'work-item-content';
            list(body, section.content);
            group.append(heading, body);
            container.append(group);
        }
    }
    const notes = document.getElementById('notesSection');
    const notesContent = document.getElementById('outNotes');
    if (notes && notesContent) {
        notes.style.display = draft.notes.trim() ? 'block' : 'none';
        list(notesContent, draft.notes);
    }
};
