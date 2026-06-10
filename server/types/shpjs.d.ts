declare module "shpjs" {
  type GeoJSONFeatureCollection = {
    type: "FeatureCollection";
    features: any[];
    [key: string]: any;
  };
  function shp(
    input: ArrayBuffer | Buffer | string,
  ): Promise<GeoJSONFeatureCollection | GeoJSONFeatureCollection[]>;
  export default shp;
}
