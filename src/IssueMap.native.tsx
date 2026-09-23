import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';
import type { PublicIssue } from './types';
import { colors } from './theme';

export type Coordinate = { latitude: number; longitude: number };
const fallback: Coordinate = { latitude: 16.5062, longitude: 80.648 };

export function IssueMap({ issues = [], selected, onSelect, onPick, center }: { issues?: PublicIssue[]; selected?: Coordinate | null; onSelect?: (issue: PublicIssue) => void; onPick?: (point: Coordinate) => void; center?: Coordinate | null }) {
  const html = useMemo(() => {
    const point = selected ?? center ?? (issues.find(item => item.latitude != null && item.longitude != null) as Coordinate | undefined) ?? fallback;
    const markers = issues.filter(item => item.latitude != null && item.longitude != null).map(item => ({ id: item.id, title: item.title, address: item.address, latitude: item.latitude, longitude: item.longitude }));
    return `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"><style>html,body,#map{height:100%;margin:0}body{font-family:system-ui}.leaflet-container{background:#eaf0ea}</style></head><body><div id="map"></div><script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script><script>
      const map=L.map('map').setView([${point.latitude},${point.longitude}],${selected || center ? 15 : 12});
      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'}).addTo(map);
      ${JSON.stringify(markers)}.forEach(function(item){L.circleMarker([item.latitude,item.longitude],{radius:9,color:'#ffffff',weight:2,fillColor:'#17694E',fillOpacity:1}).addTo(map).bindPopup('<b>'+item.title+'</b><br>'+item.address).on('click',function(e){L.DomEvent.stopPropagation(e);window.ReactNativeWebView.postMessage(JSON.stringify({kind:'select',id:item.id}))})});
      ${selected ? `L.marker([${selected.latitude},${selected.longitude}]).addTo(map);` : ''}
      map.on('click',function(e){window.ReactNativeWebView.postMessage(JSON.stringify({kind:'pick',latitude:e.latlng.lat,longitude:e.latlng.lng}))});
    </script></body></html>`;
  }, [issues, selected, center]);
  const handleMessage = (event: WebViewMessageEvent) => { try { const data = JSON.parse(event.nativeEvent.data); if (data.kind === 'select') { const item = issues.find(issue => issue.id === data.id); if (item) onSelect?.(item); } else if (data.kind === 'pick' && Number.isFinite(data.latitude) && Number.isFinite(data.longitude)) onPick?.({ latitude: data.latitude, longitude: data.longitude }); } catch { /* Ignore malformed map messages. */ } };
  return <View style={s.frame}><WebView originWhitelist={['*']} source={{ html }} onMessage={handleMessage} javaScriptEnabled domStorageEnabled /></View>;
}
const s = StyleSheet.create({ frame: { height: 310, borderRadius: 20, overflow: 'hidden', backgroundColor: colors.paperSubtle } });
