import type { ComponentType } from 'react';
import type { PublicIssue } from './types';
export type Coordinate = { latitude: number; longitude: number };
export const IssueMap: ComponentType<{ issues?: PublicIssue[]; selected?: Coordinate | null; onSelect?: (issue: PublicIssue) => void; onPick?: (point: Coordinate) => void; center?: Coordinate | null }>;
