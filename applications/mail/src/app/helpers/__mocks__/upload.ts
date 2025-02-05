import { RequestParams, Upload } from '../upload';
import { api } from '../test/api';

export const upload = <T>(uid: string, paramsPromise: RequestParams | Promise<RequestParams>): Upload<T> => {
    const asyncResolution = async () => {
        const params = await paramsPromise;
        return api(params);
    };

    return {
        xhr: {} as XMLHttpRequest,
        addProgressListener: jest.fn(),
        abort: jest.fn(),
        resultPromise: asyncResolution() as Promise<T>,
    };
};
