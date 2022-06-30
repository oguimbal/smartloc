import sha1 from 'js-sha1';

export function autoGenerateId(str: TemplateStringsArray | string[]): string {
    const sha = sha1(str.join('|'));
    return 'sha1.' + sha;
}