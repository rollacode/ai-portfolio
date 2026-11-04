import OpenGraphImage, { alt as ogAlt, size as ogSize } from './opengraph-image';

/** X/Twitter cards use the same preview as every other chat. */
export const alt = ogAlt;
export const size = ogSize;
export const contentType = 'image/png';
export default OpenGraphImage;
