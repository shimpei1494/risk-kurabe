import nearestPointOnLine from "@turf/nearest-point-on-line";
import polygonToLine from "@turf/polygon-to-line";
import type {
  Feature,
  FeatureCollection,
  LineString,
  MultiLineString,
  MultiPolygon,
  Polygon,
  Position,
} from "geojson";

export interface GeoPoint {
  latitude: number;
  longitude: number;
}

export interface BoundingBox {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

const EARTH_RADIUS_METERS = 6_371_008.8;

export function bboxAroundPoint(point: GeoPoint, radiusMeters: number): BoundingBox {
  const latitudeRadians = (point.latitude * Math.PI) / 180;
  const latitudeDelta = (radiusMeters / EARTH_RADIUS_METERS) * (180 / Math.PI);
  const longitudeDelta = latitudeDelta / Math.cos(latitudeRadians);

  return {
    minX: point.longitude - longitudeDelta,
    minY: point.latitude - latitudeDelta,
    maxX: point.longitude + longitudeDelta,
    maxY: point.latitude + latitudeDelta,
  };
}

function asLineFeatures(
  polygon: Feature<Polygon | MultiPolygon>,
): readonly Feature<LineString | MultiLineString>[] {
  const boundary = polygonToLine(polygon);
  if (boundary.type === "FeatureCollection") {
    return (boundary as FeatureCollection<LineString | MultiLineString>).features;
  }
  return [boundary as Feature<LineString | MultiLineString>];
}

export interface NearestBoundaryPoint {
  coordinate: Position;
  distanceMeters: number;
}

export function nearestPolygonBoundaryPoint(
  point: GeoPoint,
  polygon: Feature<Polygon | MultiPolygon>,
): NearestBoundaryPoint {
  let nearest: NearestBoundaryPoint | undefined;

  for (const line of asLineFeatures(polygon)) {
    const candidate = nearestPointOnLine(line, [point.longitude, point.latitude], {
      units: "meters",
    });
    const distanceMeters = candidate.properties.pointDistance;
    if (!nearest || distanceMeters < nearest.distanceMeters) {
      nearest = {
        coordinate: candidate.geometry.coordinates,
        distanceMeters,
      };
    }
  }

  if (!nearest) throw new Error("ポリゴンの境界線を取得できません");
  return nearest;
}

/**
 * originからboundaryへ向かい、境界をstepMetersだけ越えた点を返す。
 * 25m以内の局所計算なので、経緯度差を同じ比率で延長しても十分な精度を保てる。
 */
export function pointBeyondBoundary(
  origin: GeoPoint,
  boundary: NearestBoundaryPoint,
  stepMeters: number,
): GeoPoint {
  if (boundary.distanceMeters === 0) return origin;

  const ratio = (boundary.distanceMeters + stepMeters) / boundary.distanceMeters;
  const [boundaryLongitude, boundaryLatitude] = boundary.coordinate;
  if (boundaryLongitude === undefined || boundaryLatitude === undefined) {
    throw new Error("境界点の座標が不正です");
  }

  return {
    longitude: origin.longitude + (boundaryLongitude - origin.longitude) * ratio,
    latitude: origin.latitude + (boundaryLatitude - origin.latitude) * ratio,
  };
}
