export declare const api: import("axios").AxiosInstance;
import type { ApiResponse } from '@inventory/shared';
export declare function get<T>(url: string, params?: object): Promise<ApiResponse<T>>;
export declare function post<T>(url: string, body?: object): Promise<ApiResponse<T>>;
export declare function put<T>(url: string, body?: object): Promise<ApiResponse<T>>;
export declare function patch<T>(url: string, body?: object): Promise<ApiResponse<T>>;
export declare function del<T>(url: string): Promise<ApiResponse<T>>;
export declare function postForm<T>(url: string, formData: FormData): Promise<ApiResponse<T>>;
//# sourceMappingURL=api.d.ts.map