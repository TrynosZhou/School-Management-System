declare module 'mammoth' {
  export interface ConvertResult<T = any> { value: string; messages?: Array<{ type: string; message: string }>; }
  export function convertToHtml(input: { buffer: Buffer } | { arrayBuffer: ArrayBuffer }, options?: any): Promise<ConvertResult>;
  const _default: any;
  export default _default;
}
