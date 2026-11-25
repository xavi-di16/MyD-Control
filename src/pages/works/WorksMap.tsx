import { useEffect, useEffectEvent, useRef } from 'react';
import * as L from 'leaflet';
import type { WorkStatus } from '../../types';
import { defaultMapCenter, type MapPosition } from '../../utils/coordinates';
import { houseUnderConstruction, workStatuses } from './workStatus';
import 'leaflet/dist/leaflet.css';
import './worksMap.css';

export interface WorkMarker {
    id: string;
    name: string;
    status: WorkStatus;
    position: MapPosition;
}

interface LocationPicker {
    position: MapPosition | null;
    viewportTarget: MapPosition | null;
    status: WorkStatus;
    onChange: (position: MapPosition) => void;
}

const markerIcon = (status: WorkStatus, draggable = false) => {
    const { color, background, symbol } = workStatuses[status];
    return L.divIcon({
        className: 'myd-work-marker',
        html: `<span class="myd-work-pin${draggable ? ' myd-work-pin--drag' : ''}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${houseUnderConstruction}"/></svg><span class="myd-work-pin__status" style="color:${color};background:${background}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${symbol}"/></svg></span></span>`,
        iconSize: [44, 54],
        iconAnchor: [20, 52],
        tooltipAnchor: [0, -46],
    });
};

export const WorksMap = ({ label, markers = [], onOpenWork, picker, className }: {
    label: string;
    markers?: WorkMarker[];
    onOpenWork?: (id: string) => void;
    picker?: LocationPicker;
    className: string;
}) => {
    const container = useRef<HTMLDivElement>(null);
    const map = useRef<L.Map | null>(null);
    const layer = useRef<L.LayerGroup | null>(null);
    const pin = useRef<L.Marker | null>(null);
    const fitted = useRef('');
    const pickerMode = !!picker;
    const pickerPosition = picker?.position;
    const pickerStatus = picker?.status;
    const viewportTarget = picker?.viewportTarget;
    const changeLocation = useEffectEvent((coordinates: L.LatLng) => {
        const wrapped = coordinates.wrap();
        picker?.onChange([wrapped.lat, wrapped.lng]);
    });
    const openWork = useEffectEvent((id: string) => onOpenWork?.(id));

    useEffect(() => {
        if (!container.current) return;
        const instance = L.map(container.current, { scrollWheelZoom: false }).setView(defaultMapCenter, 6);
        map.current = instance;
        layer.current = L.layerGroup().addTo(instance);
        L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
            maxZoom: 19,
        }).addTo(instance);
        const zoomControl = instance.zoomControl.getContainer();
        const zoomIn = zoomControl?.querySelector('.leaflet-control-zoom-in');
        const zoomOut = zoomControl?.querySelector('.leaflet-control-zoom-out');
        zoomIn?.setAttribute('aria-label', 'Acercar mapa');
        zoomIn?.setAttribute('title', 'Acercar mapa');
        zoomOut?.setAttribute('aria-label', 'Alejar mapa');
        zoomOut?.setAttribute('title', 'Alejar mapa');
        if (pickerMode) instance.on('click', (event: L.LeafletMouseEvent) => changeLocation(event.latlng));
        const resize = new ResizeObserver(() => instance.invalidateSize({ pan: false }));
        resize.observe(container.current);
        return () => {
            resize.disconnect();
            instance.remove();
            map.current = null;
            layer.current = null;
            pin.current = null;
            fitted.current = '';
        };
    }, [pickerMode]);

    useEffect(() => {
        if (pickerMode || !map.current || !layer.current) return;
        layer.current.clearLayers();
        const zoomKey = JSON.stringify(markers.map(({ id, position }) => [id, position]));
        for (const { id, name, status, position } of markers) {
            const title = name + ' · ' + workStatuses[status].label;
            const tooltip = document.createElement('span');
            tooltip.textContent = title;
            const marker = L.marker(position, { icon: markerIcon(status), title, alt: title, keyboard: !!onOpenWork });
            marker.bindTooltip(tooltip);
            if (onOpenWork) {
                marker.on('click', () => openWork(id));
                marker.on('add', () => marker.getElement()?.setAttribute('aria-label', 'Abrir obra ' + name));
            }
            marker.addTo(layer.current);
        }
        if (zoomKey === fitted.current) return;
        fitted.current = zoomKey;
        if (markers.length === 1) map.current.setView(markers[0].position, 15);
        if (markers.length > 1) map.current.fitBounds(L.latLngBounds(markers.map(({ position }) => position)), {
            padding: [40, 56], maxZoom: 15,
        });
    }, [markers, onOpenWork, pickerMode]);

    useEffect(() => {
        if (!map.current || !pickerPosition || !pickerStatus) return;
        if (!pin.current) {
            pin.current = L.marker(pickerPosition, {
                icon: markerIcon(pickerStatus, true),
                draggable: true,
                autoPan: true,
                title: 'Ubicación de la obra. Arrastrá el pin para ajustarla.',
            }).addTo(map.current);
            pin.current.on('dragend', (event: L.DragEndEvent) => changeLocation(event.target.getLatLng()));
        } else {
            pin.current.setLatLng(pickerPosition);
            pin.current.setIcon(markerIcon(pickerStatus, true));
        }
        pin.current.getElement()?.setAttribute('aria-label', 'Pin de ubicación de la obra');
    }, [pickerPosition, pickerStatus]);

    useEffect(() => {
        if (viewportTarget) map.current?.setView(viewportTarget, 14);
    }, [viewportTarget]);

    return (
        <div className="relative isolate overflow-hidden bg-[#E9EDF0]">
            <div ref={container} className={className} aria-label={label} role="region" />
            {picker && (
                <button type="button" className="absolute bottom-7 left-3 z-[500] rounded-md bg-white px-3 py-2 text-xs font-bold shadow ring-1 ring-black/10 hover:bg-[#F5F6F8]"
                    onClick={() => {
                        const center = map.current?.getCenter().wrap();
                        if (center) picker.onChange([center.lat, center.lng]);
                    }}>
                    Poner pin en el centro
                </button>
            )}
        </div>
    );
};
