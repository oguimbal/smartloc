import { createHash } from 'crypto';

export function autoGenerateId(str: TemplateStringsArray | string[]): string {
    const sha = createHash('sha1').update(str.join('|')).digest('hex');
    return 'sha1.' + sha;
}