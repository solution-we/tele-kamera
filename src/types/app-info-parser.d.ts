declare module "app-info-parser" {
  const AppInfoParser: new (
    file: File | Blob | string,
  ) => {
    parse(): Promise<Record<string, unknown>>;
  };
  export default AppInfoParser;
}
