import { OpenPGPKey } from 'pmcrypto';

import { FetchShareMap } from './useFetchShareMap';
import { LinkMapDecryptionBuffer } from './LinkDecryptionBuffer';
import { LinkMapLoader } from './LinkMapLoader';
import { createKeysCache } from './useKeysCache';

export const createLinkGenerator = (
    shareId: string,
    rootLinkKeys: OpenPGPKey,
    callbacks: {
        fetchShareMap: FetchShareMap;
    }
) => {
    const shareMapLoader = new LinkMapLoader({ fetchShareMapPage: callbacks.fetchShareMap });
    shareMapLoader.fetchShareMap(shareId).catch(console.warn);
    const shareMapGenerator = shareMapLoader.iterateItems();

    const linkMapBuffer = new LinkMapDecryptionBuffer(shareMapGenerator, createKeysCache(rootLinkKeys));
    linkMapBuffer.decrypt(shareId).catch(console.warn);
    const decryptedLinkMetaGenerator = linkMapBuffer.iterateItems();

    return decryptedLinkMetaGenerator;
};
