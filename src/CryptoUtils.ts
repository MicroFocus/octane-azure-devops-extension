export class CryptoUtils {
    public static obfuscate(str: string) {
        return str.substr(0, 2) + '...' + str.substr(str.length - 2);
    }
}