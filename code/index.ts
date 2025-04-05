import { PrivateKey, PublicKey } from "@bsv/sdk";

const checkIfUserHasOrdinal = async (address: string, origin: string): Promise<boolean> => {
    try {
        try {
            const response = await fetch(`https://ordinals.gorillapool.io/api/inscriptions/${origin}/latest`)
            if (response.status !== 200) {
                throw new Error('Failed to fetch data from GorilaPool API');
            }

            return (await response.json()).owner === address;
        } catch {
            const response = await fetch(`https://api.whatsonchain.com/v1/bsv/main/token/1satordinals/${origin}/latest`)
            if (response.status !== 200) {
                throw new Error('Failed to fetch data from WhatsOnChain API');
            }

            return (await response.json()).token.ownerAddress === address;
        }
    } catch {
        return false;
    }
}

const generatePrivateKey = (): string => {
    return PrivateKey.fromRandom().toWif();
}

const privKeyToPubKey = (privKey: string): string => {
    return PrivateKey.fromWif(privKey).toPublicKey().toString();
}

const privKeyToAddress = (privKey: string): string => {
    return PrivateKey.fromWif(privKey).toAddress();
}

const pubKeyToAddress = (pubKey: string): string => {
    return PublicKey.fromString(pubKey).toAddress();
}

(window as any).ord = {
    checkIfUserHasOrdinal,
    generatePrivateKey,
    privKeyToPubKey,
    privKeyToAddress,
    pubKeyToAddress,
};