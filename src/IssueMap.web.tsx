import { createElement, useEffect, useMemo, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import type { PublicIssue } from './types';
import { colors } from './theme';
export type Coordinate = { latitude: number; longitude: number };
const emptyIssues: PublicIssue[] = [];

export function IssueMap({ issues = emptyIssues, selected, center, onSelect, onPick }: { issues?: PublicIssue[]; selected?: Coordinate | null; onSelect?: (issue: PublicIssue) => void; onPick?: (point: Coordinate) => void; center?: Coordinate | null }) {
  const frame = useRef<HTMLIFrameElement>(null);
  useEffect(() => { const onMessage = (event: MessageEvent) => { if (event.source !== frame.current?.contentWindow || event.data?.source !== 'civicfix-map') return; if (event.data.kind === 'select') { const item = issues.find(issue => issue.id === event.data.id); if (item) onSelect?.(item); } else if (event.data.kind === 'pick' && Number.isFinite(event.data.latitude) && Number.isFinite(event.data.longitude)) onPick?.({ latitude: event.data.latitude, longitude: event.data.longitude }); }; window.addEventListener('message', onMessage); return () => window.removeEventListener('message', onMessage); }, [issues, onSelect, onPick]);
  const html = useMemo(() => {
    const point = selected ?? center ?? (issues.find(item => item.latitude != null && item.longitude != null) as Coordinate | undefined) ?? { latitude: 16.5062, longitude: 80.648 };
    const markers = issues.filter(item => item.latitude != null && item.longitude != null).map(item => ({ id: item.id, latitude: item.latitude, longitude: item.longitude }));
    return `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=" crossorigin=""><style>html,body,#map{height:100%;margin:0}body{font-family:system-ui}.leaflet-container{background:#eaf0ea}</style></head><body><div id="map"></div><script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js" integrity="sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=" crossorigin=""></script><script>
      const map=L.map('map').setView([${point.latitude},${point.longitude}],${selected || center ? 15 : 12});
      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'}).addTo(map);
      ${JSON.stringify(markers)}.forEach(function(item){L.circleMarker([item.latitude,item.longitude],{radius:9,color:'#ffffff',weight:2,fillColor:'#17694E',fillOpacity:1}).addTo(map).on('click',function(e){L.DomEvent.stopPropagation(e);parent.postMessage({source:'civicfix-map',kind:'select',id:item.id},'*')})});
      ${selected ? `L.marker([${selected.latitude},${selected.longitude}]).addTo(map);` : ''}
      map.on('click',function(e){parent.postMessage({source:'civicfix-map',kind:'pick',latitude:e.latlng.lat,longitude:e.latlng.lng},'*')});
    </script></body></html>`;
  }, [issues, selected, center]);
  return <View style={s.frame}>{createElement('iframe', { ref: frame, srcDoc: html, title: 'Interactive civic issue map', style: { border: 0, width: '100%', height: '100%' } })}</View>;
}
const s = StyleSheet.create({ frame: { height: 310, borderRadius: 20, overflow: 'hidden', backgroundColor: colors.paperSubtle } });
